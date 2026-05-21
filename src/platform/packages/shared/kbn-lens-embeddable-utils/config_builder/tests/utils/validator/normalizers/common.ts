/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { orderBy } from 'lodash';

import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { Reference } from '@kbn/content-management-utils';
import type { FormBasedPersistedState, TextBasedPersistedState } from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';

import {
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
  LENS_SAMPLING_DEFAULT_VALUE,
} from '../../../../schema/constants';
import type { LensAttributes } from '../../../../types';
import { getValues, type NormalizerConfig } from './normalize';
import { getContinuity, getRangeValue } from '../../../../transforms/coloring';
import { stripUndefined } from '../../../../transforms/charts/utils';
import { generateAdHocDataViewId } from '../../../../transforms/utils';

const COMMON_STATE_IGNORE_PATHS = [
  'type', // misplaced type, see https://github.com/elastic/kibana/issues/245683
  'state.filters', // remove for now
  'state.visualization.title', // removed by-value nested title
  // TODO: check missing properties striped out in transforms
  'state.datasourceStates.formBased.layers.*.indexPatternId',
  'state.datasourceStates.formBased.currentIndexPatternId',
  // Label and customLabel diffs
  'state.datasourceStates.*.layers.*.columns.*.label', // is kept at state -> API only if it is a custom label
  'state.datasourceStates.*.layers.*.columns.*.customLabel', // dropped at state -> API and only applied from API -> State if label is explicitly set
  // TODO: check DSL differing properties changed in transforms
  'state.datasourceStates.formBased.layers.*.columns.*.params',
  'state.datasourceStates.formBased.layers.*.columns.*.scale', // conditionally set for data columns
  // TODO: check missing ES|QL column properties stripped out in transforms
  'state.datasourceStates.textBased.layers.*.columns.*.inMetricDimension', // dropped at state -> API and only applied from API -> State if explicitly set
  'state.datasourceStates.textBased.layers.*.columns.*.meta.esType',
  // TODO: check missing/different properties on adHocDataViews
  'state.adHocDataViews.*.fieldAttrs',
  'state.adHocDataViews.*.managed',
  'state.adHocDataViews.*.timeFieldName', // not saved in API re-derived at runtime
];

export const DEFAULT_LAYER_ID = 'layer_0';

export type IdRemapping = Array<[old: string | undefined, new: string]>;

function normalizeAdHocDataViews(attributes: LensAttributes) {
  if (Object.keys(attributes.state.adHocDataViews ?? {}).length === 0) {
    delete attributes.state.adHocDataViews;
  }

  if (
    attributes.state.datasourceStates.textBased &&
    'indexPatternRefs' in attributes.state.datasourceStates.textBased
  ) {
    delete attributes.state.datasourceStates.textBased.indexPatternRefs;
  }

  const internalReferences = attributes.state.internalReferences ?? [];

  if (
    attributes.state.datasourceStates.textBased &&
    attributes.state.adHocDataViews &&
    attributes.state.datasourceStates.textBased?.layers
  ) {
    const layers = Object.values(attributes.state.datasourceStates.textBased.layers);
    for (const layer of layers) {
      const oldIndex = layer.index;
      if (!oldIndex) continue;

      const adHocDataView: DataViewSpec = attributes.state.adHocDataViews[oldIndex];
      if (!adHocDataView) continue;

      const newId = generateAdHocDataViewId({
        index: adHocDataView.name ?? '',
        dataSourceType: 'esql',
        esqlQuery: layer.query?.esql,
        timeFieldName: undefined, // not saved in API re-derived at runtime
      });

      layer.index = newId;
      adHocDataView.id = newId;
      attributes.state.adHocDataViews[newId] = adHocDataView;
      delete attributes.state.adHocDataViews[oldIndex];

      internalReferences.push({
        id: newId,
        name: `indexpattern-datasource-layer-${DEFAULT_LAYER_ID}`,
        type: 'index-pattern',
      });
    }
  }

  attributes.state.internalReferences = internalReferences;
  if (attributes.state.internalReferences.length === 0) {
    delete attributes.state.internalReferences;
  }
}

const normalizeReferences = <T extends LensAttributes>(
  { references, state }: T,
  replacements: IdRemapping
): Reference[] => {
  const filterIndexIds = new Set(
    state.filters.map((filter) => filter.meta?.index).filter((s): s is string => !!s)
  );

  return orderBy(
    references
      .filter((reference) => {
        // ignore filter index pattern references
        return !(reference.type === 'index-pattern' && filterIndexIds.has(reference.name));
      })
      // ignore current index pattern reference
      .filter((reference) => {
        return !(
          reference.type === 'index-pattern' &&
          reference.name === 'indexpattern-datasource-current-indexpattern'
        );
      })
      .map((reference) => {
        let name = reference.name;

        // replace all layer ids in reference name
        replacements.forEach(([oldId, newId]) => {
          if (oldId && name.includes(oldId)) {
            name = name.replace(oldId, newId);
          }
        });

        return {
          ...reference,
          name,
        };
      }),
    ['name', 'id', 'type'] // order is superfluous but ensures consistent comparison
  );
};

export const getCommonNormalizer = <T extends LensAttributes>(
  getArgs: (attributes: T) => { layerRemapping: IdRemapping; columnRemapping: IdRemapping }
): NormalizerConfig<T> => ({
  order: -1,
  ignore: COMMON_STATE_IGNORE_PATHS,
  original: (attributes: T) => {
    const { layerRemapping, columnRemapping } = getArgs(attributes);

    normalizeAdHocDataViews(attributes);

    // replace layer in reference name
    attributes.references = normalizeReferences(attributes, layerRemapping);

    const layerIdMap = new Map(layerRemapping);
    const columnIdMap = new Map(columnRemapping);

    function normalizeDatasourceState<S extends FormBasedPersistedState | TextBasedPersistedState>(
      dsState: S | undefined,
      fn: (ds: S) => S
    ): S | undefined {
      // remove empty datasource states
      if (!dsState || Object.keys(dsState.layers).length === 0) return;

      // prune erroneous columns and swap ids
      for (const [id, layer] of Object.entries(dsState.layers)) {
        // apply defaults
        layer.ignoreGlobalFilters =
          layer.ignoreGlobalFilters ?? LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE;

        if (layerIdMap.has(id)) {
          const newId = layerIdMap.get(id)!;
          dsState.layers[newId] = layer;
          delete dsState.layers[id];
        }
      }

      return fn(dsState);
    }

    attributes.state.datasourceStates = stripUndefined({
      textBased: normalizeDatasourceState(attributes.state.datasourceStates.textBased, (ds) => {
        for (const layer of Object.values(ds.layers)) {
          layer.columns = layer.columns.map((column) => {
            return {
              ...column,
              columnId: columnIdMap.get(column.columnId) ?? column.columnId,
            };
          });

          if (layer.timeField) {
            layer.timeField = undefined; // not saved in API re-derived at runtime
          }
        }

        return ds;
      }),
      formBased: normalizeDatasourceState(
        attributes.state.datasourceStates.formBased ??
          ((attributes.state.datasourceStates as any).indexpattern as FormBasedPersistedState), // fallback to legacy
        (ds) => {
          for (const layer of Object.values(ds.layers)) {
            layer.columns = columnRemapping.reduce((columns, [oldColumn, newColumn]) => {
              if (oldColumn && layer.columns[oldColumn]) {
                columns[newColumn] = layer.columns[oldColumn];
              }

              return columns;
            }, {} as typeof layer.columns);

            layer.columnOrder = layer.columnOrder
              .filter((colId: string) => columnIdMap.has(colId))
              .map(
                (colId: string) =>
                  columnRemapping.find(([oldColumn]) => oldColumn === colId)?.[1] ?? colId
              );

            // TODO: validate this is order should only be preserved for datatable
            if (attributes.visualizationType !== 'lnsDatatable') {
              layer.columnOrder.sort();
            }

            // apply defaults
            layer.sampling = layer.sampling ?? LENS_SAMPLING_DEFAULT_VALUE;

            // remove empty incompleteColumns
            if (Object.keys(layer.incompleteColumns ?? {}).length === 0) {
              delete layer.incompleteColumns;
            }

            if (layer.linkToLayers) {
              layer.linkToLayers = layer.linkToLayers?.map((l) => layerIdMap.get(l) ?? l);
            }

            for (const col of Object.values(layer.columns)) {
              // scale is not preserved through transforms
              delete col.scale;

              // remap inner column references (e.g. orderBy.columnId in terms columns)
              const orderByCol = (col as any).params?.orderBy?.columnId;
              if (orderByCol && columnIdMap.has(orderByCol)) {
                (col as any).params.orderBy.columnId = columnIdMap.get(orderByCol);
              }

              if (col.operationType === 'formula') {
                (col as any).references = [];
              }

              // TODO: check this dataType mismatch
              if (col.dataType === 'ip') {
                col.dataType = 'string'; // ip is set to string in transforms
              }
            }
          }
          return ds;
        }
      ),
    });

    attributes.state.needsRefresh = attributes.state.needsRefresh ?? false;
    attributes.version = LENS_ITEM_LATEST_VERSION; // transforms should return latest version

    return attributes;
  },
  transformed: (attributes: T) => {
    if (Object.keys(attributes.state.adHocDataViews ?? {}).length === 0) {
      delete attributes.state.adHocDataViews;
    }

    if (attributes.state.internalReferences?.length === 0) {
      delete attributes.state.internalReferences;
    }

    // remove as-code filter references
    attributes.references = attributes.references.filter((reference) => {
      return !(reference.type === 'index-pattern' && reference.name.startsWith('filter-ref-'));
    });

    attributes.state.needsRefresh = attributes.state.needsRefresh ?? false;

    // TODO: validate this is order should only be preserved for datatable
    if (attributes.visualizationType !== 'lnsDatatable') {
      Object.values(attributes.state.datasourceStates.formBased?.layers ?? {}).forEach((layer) => {
        layer.columnOrder.sort();
      });
    }

    return attributes;
  },
});

/**
 * Normalized the palette params provided a string path to the palette(s) in the attributes
 *
 * This need to address:
 * - account for bad last color stop including shifting palettes :(
 * - defaulting missing rangeType
 * - defaulting missing continuity
 */
export function getPaletteNormalizer<T extends LensAttributes>(
  palettePath: string
): NormalizerConfig<T> {
  return {
    original: (attributes: T) => {
      const palettes = getValues<PaletteOutput<CustomPaletteParams>>(attributes, palettePath);

      palettes.forEach((palette) => {
        const rangeMin = getRangeValue(palette.params?.rangeMin);
        const rangeMax = getRangeValue(palette.params?.rangeMax);

        if (palette.params) {
          if (palette.params.stops && rangeMax === null) {
            const isLegacy = palette.name !== 'custom';
            const needsPaletteShift =
              isLegacy &&
              ((rangeMin !== null && rangeMin === palette.params.stops.at(0)?.stop) ||
                (rangeMax !== null && rangeMax !== palette.params.stops.at(-1)?.stop));
            const lastStop = palette.params.stops.at(-1);
            if (lastStop && !needsPaletteShift) lastStop.stop = rangeMax as unknown as number; // can be null
          }

          if (!palette.params?.rangeType) {
            palette.params.rangeType = 'percent';
          }

          if (!palette.params?.continuity) {
            palette.params.continuity = getContinuity(rangeMin, rangeMax);
          }

          if (palette.name !== 'custom') {
            delete palette.params.colorStops;
          }
        }
      });

      return attributes;
    },
    transformed: (attributes: T) => {
      const palettes = getValues<PaletteOutput<CustomPaletteParams>>(attributes, palettePath);

      palettes.forEach((palette) => {
        if (palette.name !== 'custom') {
          delete palette.params?.colorStops;
        }
      });

      return attributes;
    },
    ignore: [
      'maxSteps', // often omitted in original
      'progression', // deprecated but defaults to 'fixed'
      'reverse', // typically unused or omitted
      'steps', // count of steps in original is not right
    ].map((param) => `${palettePath}.params.${param}`),
  };
}
