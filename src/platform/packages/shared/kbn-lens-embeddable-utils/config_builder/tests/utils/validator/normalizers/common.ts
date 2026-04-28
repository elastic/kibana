/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import {
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
  LENS_SAMPLING_DEFAULT_VALUE,
} from '../../../../schema/constants';
import type { LensAttributes } from '../../../../types';
import { getValues, type NormalizerConfig } from './normalize';
import { getContinuity, getRangeValue } from '../../../../transforms/coloring';

const COMMON_STATE_IGNORE_PATHS = [
  'type', // misplaced type, see https://github.com/elastic/kibana/issues/245683
  'state.filters', // remove for now
  'state.visualization.title', // removed by-value nested title
];

export const DEFAULT_LAYER_ID = 'layer_0';

export type ColumnRemapping = Array<[old: string | undefined, new: string]>;

function removeEmptyProperties(attributes: LensAttributes) {
  if (Object.keys(attributes.state.adHocDataViews ?? {}).length === 0) {
    delete attributes.state.adHocDataViews;
  }
  if (attributes.state.internalReferences?.length === 0) {
    delete attributes.state.internalReferences;
  }
}

export const getCommonNormalizer = <T extends LensAttributes>(
  getArgs: (attributes: T) => { layerId: string; columnRemapping: ColumnRemapping }
): NormalizerConfig<T> => ({
  order: -1,
  ignore: COMMON_STATE_IGNORE_PATHS,
  original: (attributes: T) => {
    const { layerId, columnRemapping } = getArgs(attributes);

    removeEmptyProperties(attributes);

    // Move deprecated indexpattern datasource to formBased
    attributes.state.datasourceStates.formBased =
      attributes.state.datasourceStates.formBased ??
      (attributes.state.datasourceStates as any).indexpattern;
    delete (attributes.state.datasourceStates as any).indexpattern;

    const filterIndexIds = new Set(
      attributes.state.filters.map((filter) => filter.meta?.index).filter((s): s is string => !!s)
    );

    // replace layer in reference name
    attributes.references = attributes.references
      // ignore filter index patterns for now
      .filter((reference) => {
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
        const name = reference.name.includes(layerId)
          ? reference.name.replace(layerId, DEFAULT_LAYER_ID)
          : reference.name;

        return { ...reference, name };
      });

    const idMap = Object.fromEntries(columnRemapping);

    for (const [dsType, dsState] of Object.entries(attributes.state.datasourceStates)) {
      for (const [id, layer] of Object.entries(dsState.layers)) {
        // swap column names
        columnRemapping.forEach(([oldColumn, newColumn]) => {
          if (oldColumn && layer.columns[oldColumn]) {
            layer.columns[newColumn] = layer.columns[oldColumn];
            delete layer.columns[oldColumn];
          }
        });

        layer.columnOrder = layer.columnOrder.map(
          (colId: string) =>
            columnRemapping.find(([oldColumn]) => oldColumn === colId)?.[1] ?? colId
        );

        // apply defaults
        layer.sampling = layer.sampling ?? LENS_SAMPLING_DEFAULT_VALUE;
        layer.ignoreGlobalFilters =
          layer.ignoreGlobalFilters ?? LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE;

        // remove incompleteColumns
        if (Object.keys(layer.incompleteColumns ?? {}).length === 0) {
          delete layer.incompleteColumns;
        }

        // sort columnOrder for consistent comparison
        layer.columnOrder = [...layer.columnOrder].sort();

        for (const col of Object.values(layer.columns)) {
          // scale is not preserved through transforms
          delete (col as any).scale;
          // remap inner column references (e.g. orderBy.columnId in terms columns)
          const orderByCol = (col as any).params?.orderBy?.columnId;
          if (orderByCol && idMap[orderByCol]) {
            (col as any).params.orderBy.columnId = idMap[orderByCol];
          }
        }

        if (layerId === id) {
          dsState.layers[DEFAULT_LAYER_ID] = layer;
          delete dsState.layers[id];
        }
      }

      // remove empty datasource states
      if (Object.keys(dsState.layers).length === 0) {
        delete (attributes.state.datasourceStates as any)[dsType];
      }
    }

    return attributes;
  },
  transformed: (attributes: T) => {
    removeEmptyProperties(attributes);

    // remove as-code filter references
    attributes.references = attributes.references.filter((reference) => {
      return !(reference.type === 'index-pattern' && reference.name.startsWith('filter-ref-'));
    });

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
