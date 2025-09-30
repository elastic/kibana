/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  FormBasedLayer,
  FormBasedPersistedState,
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type {
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter, Query } from '@kbn/es-query';
import type { LensAttributes, LensDatatableDataset } from '../types';
import type { LensApiState, NarrowByType } from '../schema';
import { fromBucketLensStateToAPI } from './columns/buckets';
import { getMetricApiColumnFromLensState } from './columns/metric';
import type { AnyLensStateColumn } from './columns/types';
import { isLensStateBucketColumnType } from './columns/utils';
import { LENS_LAYER_SUFFIX, LENS_DEFAULT_TIME_FIELD, INDEX_PATTERN_ID } from './constants';
import {
  LENS_SAMPLING_DEFAULT_VALUE,
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
} from '../schema/constants';
import type { LensApiFilterType } from '../schema/filter';

type DataSourceStateLayer =
  | FormBasedPersistedState['layers'] // metric chart can return 2 layers (one for the metric and one for the trendline)
  | PersistedIndexPatternLayer
  | TextBasedPersistedState['layers'][0];

export function createDataViewReference(index: string, layerId: string): SavedObjectReference {
  return {
    type: INDEX_PATTERN_ID,
    id: index,
    name: `${LENS_LAYER_SUFFIX}${layerId}`,
  };
}

export const getDefaultReferences = (
  index: string,
  dataLayerId: string
): SavedObjectReference[] => {
  return [createDataViewReference(index, dataLayerId)];
};

// Need to dance a bit to satisfy TypeScript
function convertToTypedLayerColumns(layer: FormBasedLayer): {
  columns: Record<string, AnyLensStateColumn>;
} {
  // @TODO move it to satisfies
  return layer as { columns: Record<string, AnyLensStateColumn> };
}

/**
 * given Lens State layer and column id, returns the corresponding Lens API operation
 * @param columnId
 * @param layer
 * @returns
 */
export const operationFromColumn = (columnId: string, layer: FormBasedLayer) => {
  const typedLayer = convertToTypedLayerColumns(layer);
  const column = typedLayer.columns[columnId];
  if (!column) {
    return undefined;
  }
  // map columns to array of { column, id }
  const columnMap = Object.entries(layer.columns).map(([id, c]) => ({
    column: c as AnyLensStateColumn,
    id,
  }));
  if (isLensStateBucketColumnType(column)) {
    return fromBucketLensStateToAPI(column, columnMap);
  }
  return getMetricApiColumnFromLensState(column, typedLayer.columns);
};

function isTextBasedLayer(
  layer: LensApiState | FormBasedLayer | TextBasedLayer
): layer is TextBasedLayer {
  return 'index' in layer && 'query' in layer;
}

function getAdHocDataViewSpec(dataView: {
  type: 'adHocDataView';
  index: string;
  timeFieldName: string;
}) {
  return {
    id: uuidv4({}),
    title: dataView.index,
    name: dataView.index,
    timeFieldName: dataView.timeFieldName,
    sourceFilters: [],
    fieldFormats: {},
    runtimeFieldMap: {},
    fieldAttrs: {},
    allowNoIndex: false,
    allowHidden: false,
  };
}

export const getAdhocDataviews = (
  dataviews: Record<
    string,
    | { type: 'dataView'; id: string }
    | { type: 'adHocDataView'; index: string; timeFieldName: string }
  >
) => {
  // filter out ad hoc dataViews only
  const adHocDataViewsFiltered = Object.entries(dataviews).filter(
    ([_layerId, dataViewEntry]) => dataViewEntry.type === 'adHocDataView'
  ) as [string, { type: 'adHocDataView'; index: string; timeFieldName: string }][];

  const internalReferencesMap = new Map<
    { type: 'adHocDataView'; index: string; timeFieldName: string },
    { layerIds: string[]; id: string }
  >();

  // dedupe and map multiple layer references to the same ad hoc dataview
  for (const [layerId, dataViewEntry] of adHocDataViewsFiltered) {
    if (!internalReferencesMap.has(dataViewEntry)) {
      internalReferencesMap.set(dataViewEntry, { layerIds: [], id: uuidv4({}) });
    }
    const internalRef = internalReferencesMap.get(dataViewEntry)!;
    internalRef.layerIds.push(layerId);
  }

  const adHocDataViews: Record<string, DataViewSpec> = {};
  const internalReferences: SavedObjectReference[] = [];
  for (const [baseSpec, { layerIds, id }] of internalReferencesMap.entries()) {
    adHocDataViews[id] = getAdHocDataViewSpec(baseSpec);
    for (const layerId of layerIds) {
      internalReferences.push(createDataViewReference(id, layerId));
    }
  }

  return { adHocDataViews, internalReferences };
};

/**
 * Builds dataset state from the layer configuration
 *
 * @param layer Lens State Layer
 * @returns Lens API Dataset configuration
 */
export const buildDatasetState = (
  layer: FormBasedLayer | TextBasedLayer,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences: SavedObjectReference[] = [],
  layerId: string
): LensApiState['dataset'] => {
  if (isTextBasedLayer(layer)) {
    return {
      type: 'esql',
      query: layer.query?.esql ?? '',
    };
  }

  const adhocReference = (adhocReferences ?? []).find(
    (ref) => ref.name === `${LENS_LAYER_SUFFIX}${layerId}`
  );
  if (adhocReference && adHocDataViews?.[adhocReference.id]) {
    return {
      type: 'index',
      index: adHocDataViews[adhocReference.id].title!,
      time_field: adHocDataViews[adhocReference.id].timeFieldName ?? LENS_DEFAULT_TIME_FIELD,
    };
  }

  const reference = (references ?? []).find((ref) => ref.name === `${LENS_LAYER_SUFFIX}${layerId}`);
  if (reference) {
    return {
      type: 'dataView',
      id: reference.id,
    };
  }

  return {
    type: 'dataView',
    id: layer.indexPatternId,
  };
};

// builds Lens State references from list of dataviews
export function buildReferences(dataviews: Record<string, string>) {
  const references = [];
  for (const layerid in dataviews) {
    if (dataviews[layerid]) {
      references.push(getDefaultReferences(dataviews[layerid], layerid));
    }
  }
  return references.flat(2);
}

export function isSingleLayer(
  layer: DataSourceStateLayer
): layer is PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0] {
  return layer && typeof layer === 'object' && ('columnOrder' in layer || 'columns' in layer);
}

/**
 * Gets DataView from the dataset configuration
 *
 * @param dataset
 * @param dataViewsAPI
 * @returns
 */
export function getDatasetIndex(dataset: LensApiState['dataset']) {
  const timeFieldName: string = LENS_DEFAULT_TIME_FIELD;
  switch (dataset.type) {
    case 'index':
      return {
        index: dataset.index,
        timeFieldName,
      };
    case 'esql':
      return {
        index: getIndexPatternFromESQLQuery(dataset.query),
        timeFieldName,
      };
    case 'dataView':
      return {
        index: dataset.id,
        timeFieldName,
      };
    case 'table':
      return;
    default:
      throw Error('dataset type not supported');
  }
}

// internal function used to build datasource states layer
function buildDatasourceStatesLayer(
  layer: LensApiState,
  i: number,
  dataset: LensApiState['dataset'],
  index: { index: string; timeFieldName: string },
  buildDataLayers: (
    config: unknown,
    i: number,
    index: { index: string; timeFieldName: string }
  ) => FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | undefined,
  getValueColumns: (config: unknown, i: number) => TextBasedLayerColumn[] // ValueBasedLayerColumn[]
): ['textBased' | 'formBased', DataSourceStateLayer | undefined] {
  function buildValueLayer(
    config: LensApiState,
    ds: NarrowByType<LensApiState['dataset'], 'table'>
  ): TextBasedPersistedState['layers'][0] {
    const table = ds.table as LensDatatableDataset;
    const newLayer = {
      table,
      columns: getValueColumns(config, i),
      allColumns: table.columns.map(
        (column): TextBasedLayerColumn => ({
          fieldName: column.name,
          columnId: column.id,
          meta: column.meta,
        })
      ),
      index: '',
      query: undefined,
    };

    return newLayer;
  }

  function buildESQLLayer(
    config: LensApiState,
    ds: NarrowByType<LensApiState['dataset'], 'esql'>
  ): TextBasedPersistedState['layers'][0] {
    const columns = getValueColumns(config, i);

    return {
      index: index.index,
      query: { esql: ds.query },
      timeField: LENS_DEFAULT_TIME_FIELD,
      columns,
    };
  }

  if (dataset.type === 'esql') {
    return ['textBased', buildESQLLayer(layer, dataset)];
  }
  if (dataset.type === 'table') {
    return ['textBased', buildValueLayer(layer, dataset)];
  }
  return ['formBased', buildDataLayers(layer, i, index)];
}

/**
 * Builds lens config datasource states from LensApiState
 *
 * @param config lens api state
 * @param dataviews list to which dataviews are added
 * @param buildFormulaLayers function used when dataset type is index or dataView
 * @param getValueColumns function used when dataset type is table or esql
 * @param dataViewsAPI dataViews service
 * @returns lens datasource states
 *
 */
export const buildDatasourceStates = (
  config: LensApiState,
  buildFormulaLayers: (
    config: unknown,
    i: number,
    index: { index: string; timeFieldName: string }
  ) => PersistedIndexPatternLayer | FormBasedPersistedState['layers'] | undefined,
  getValueColumns: (config: any, i: number) => TextBasedLayerColumn[]
) => {
  let layers: Partial<LensAttributes['state']['datasourceStates']> = {};

  const mainDataset = config.dataset;
  const usedDataviews: Record<
    string,
    | { type: 'dataView'; id: string }
    | { type: 'adHocDataView'; index: string; timeFieldName: string }
  > = {};
  // a few charts types support multiple layers
  const configLayers = 'layers' in config ? (config.layers as LensApiState[]) : [config];
  for (let i = 0; i < configLayers.length; i++) {
    const layer = configLayers[i];
    const layerId = `layer_${i}`;
    const dataset = layer.dataset || mainDataset;

    if (!dataset) {
      throw Error('dataset must be defined');
    }

    const index = getDatasetIndex(dataset);

    const [type, layerConfig] = buildDatasourceStatesLayer(
      layer,
      i,
      dataset,
      index!,
      buildFormulaLayers,
      getValueColumns
    );
    if (layerConfig) {
      layers = {
        ...layers,
        [type]: {
          layers: isSingleLayer(layerConfig)
            ? { ...layers[type]?.layers, [layerId]: layerConfig }
            : // metric chart can return 2 layers (one for the metric and one for the trendline)
              { ...layerConfig },
        },
      };
    }

    // keep record of all dataviews used by layers
    if (index) {
      Object.keys(layers[type]?.layers ?? []).forEach((id) => {
        usedDataviews[id] =
          dataset.type === 'dataView'
            ? { type: 'dataView', id: dataset.id }
            : {
                type: 'adHocDataView',
                ...index,
              };
      });
    }
  }

  return { layers, usedDataviews };
};

// adds new column to existing layer
export const addLayerColumn = (
  layer: PersistedIndexPatternLayer,
  columnName: string,
  config: GenericIndexPatternColumn | GenericIndexPatternColumn[],
  first = false,
  postfix = ''
) => {
  const [column, referenceColumn] = Array.isArray(config) ? config : [config];
  const name = columnName + postfix;
  const referenceColumnId = `${name}_reference`;
  layer.columns = {
    ...layer.columns,
    [name]: column,
    ...(referenceColumn ? { [referenceColumnId]: referenceColumn } : {}),
  };
  if (first) {
    layer.columnOrder.unshift(name);
    if (referenceColumn) {
      layer.columnOrder.unshift(referenceColumnId);
    }
  } else {
    layer.columnOrder.push(name);
    if (referenceColumn) {
      layer.columnOrder.push(referenceColumnId);
    }
  }
};

/**
 * Generates the base layer
 *
 * @param id
 * @param options
 * @returns
 */
export const generateLayer = (
  id: string,
  options: LensApiState
): Record<string, PersistedIndexPatternLayer> => {
  return {
    [id]: {
      sampling: options.sampling,
      ignoreGlobalFilters: options.ignore_global_filters,
      columns: {},
      columnOrder: [],
    },
  };
};

export const generateApiLayer = (options: PersistedIndexPatternLayer | TextBasedLayer) => {
  if (!('columnOrder' in options)) {
    return {
      sampling: LENS_SAMPLING_DEFAULT_VALUE,
      ignore_global_filters: LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
    };
  }
  // mind this is already filled by schema validate
  return {
    sampling: options.sampling ?? LENS_SAMPLING_DEFAULT_VALUE,
    ignore_global_filters: options.ignoreGlobalFilters ?? LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
  };
};

export const filtersToApiFormat = (filters: Filter[]): LensApiFilterType[] => {
  return filters.map((filter) => ({
    language: filter.query?.language,
    query: filter.query?.query,
    meta: {},
  }));
};

export const queryToApiFormat = (query: Query): LensApiFilterType | undefined => {
  if (typeof query.query !== 'string') {
    return;
  }
  return {
    query: query.query,
    language: query.language as 'kuery' | 'lucene',
  };
};

export const filtersToLensState = (filters: LensApiFilterType[]): Filter[] => {
  return filters.map((filter) => ({
    query: { query: filter.query, language: filter.language },
    meta: {},
  }));
};

export const queryToLensState = (query: LensApiFilterType): Query => {
  return query;
};

export const filtersAndQueryToApiFormat = (state: LensAttributes) => {
  return {
    filters: filtersToApiFormat(state.state.filters),
    query: queryToApiFormat(state.state.query as Query),
  };
};

export const filtersAndQueryToLensState = (state: LensApiState) => {
  return {
    ...(state.filters ? { filters: filtersToLensState(state.filters) } : {}),
    ...(state.query ? { query: queryToLensState(state.query as LensApiFilterType) } : {}),
  };
};

export type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T // don't mutate functions
  : T extends ReadonlyArray<infer U>
  ? DeepMutable<U>[] // handle readonly arrays
  : T extends object
  ? {
      -readonly [P in keyof T]: DeepMutable<T[P]>;
    }
  : T;

export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T // don't mutate functions
  : T extends ReadonlyArray<infer U>
  ? DeepPartial<U>[] // handle readonly arrays
  : T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
