/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  FormBasedLayer,
  FormBasedPersistedState,
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import { cleanupFormulaReferenceColumns } from '@kbn/lens-common';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType, type Filter, type Query } from '@kbn/es-query';
import type { LensAttributes, LensDatatableDataset } from '../types';
import type { LensApiAllOperations, LensApiState, NarrowByType } from '../schema';
import { fromBucketLensStateToAPI } from './columns/buckets';
import { getMetricApiColumnFromLensState } from './columns/metric';
import type { AnyLensStateColumn } from './columns/types';
import { isLensStateBucketColumnType } from './columns/utils';
import { LENS_LAYER_SUFFIX, LENS_DEFAULT_TIME_FIELD, INDEX_PATTERN_ID } from './constants';
import {
  LENS_SAMPLING_DEFAULT_VALUE,
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
} from '../schema/constants';
import type { LayerSettingsSchema } from '../schema/shared';
import type { LensApiFilterType, UnifiedSearchFilterType } from '../schema/filter';
import type { DatasetType, DatasetTypeESQL, DatasetTypeNoESQL } from '../schema/dataset';
import type { LayerTypeESQL } from '../schema/charts/xy';

export type DataSourceStateLayer =
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
function convertToTypedLayerColumns(layer: Omit<FormBasedLayer, 'indexPatternId'>): {
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
export const operationFromColumn = (
  columnId: string,
  layer: Omit<FormBasedLayer, 'indexPatternId'>
): LensApiAllOperations | undefined => {
  const cleanedLayer = cleanupFormulaReferenceColumns(layer);
  const typedLayer = convertToTypedLayerColumns(cleanedLayer);
  const column = typedLayer.columns[columnId];
  if (!column) return;

  // map columns to array of { column, id } in columnOrder sequence (matches visualization.columns order)
  const columnMap = cleanedLayer.columnOrder
    .filter((id) => cleanedLayer.columns[id] != null)
    .map((id) => ({
      // need to cast here as the GenericIndexPatternColumn type is not compatible with Reference based column types
      column: cleanedLayer.columns[id] as AnyLensStateColumn,
      id,
    }));

  if (isLensStateBucketColumnType(column)) {
    return fromBucketLensStateToAPI(column, columnMap);
  }
  return getMetricApiColumnFromLensState(column, typedLayer.columns);
};

export function isFormBasedLayer(
  layer: DataSourceStateLayer
): layer is Omit<FormBasedLayer, 'indexPatternId'> {
  return 'columnOrder' in layer;
}

export function isTextBasedLayer(
  layer: LensApiState | DataSourceStateLayer
): layer is TextBasedLayer {
  return 'index' in layer && 'query' in layer;
}

function generateAdHocDataViewId(dataView: {
  type: 'adHocDataView';
  index: string;
  timeFieldName: string;
}) {
  return `${dataView.index}-${dataView.timeFieldName ?? 'no_time_field'}`;
}

function getAdHocDataViewSpec(dataView: {
  type: 'adHocDataView';
  index: string;
  timeFieldName: string;
}) {
  return {
    // Improve id genertation to be more predictable and hit cache more often
    id: generateAdHocDataViewId(dataView),
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
      internalReferencesMap.set(dataViewEntry, {
        layerIds: [],
        id: generateAdHocDataViewId(dataViewEntry),
      });
    }
    const internalRef = internalReferencesMap.get(dataViewEntry)!;
    internalRef.layerIds.push(layerId);
  }

  const adHocDataViews: Record<string, DataViewSpec> = {};
  const internalReferences: SavedObjectReference[] = [];
  for (const [baseSpec, { layerIds, id }] of Array.from(internalReferencesMap.entries())) {
    adHocDataViews[id] = getAdHocDataViewSpec(baseSpec);
    for (const layerId of layerIds) {
      internalReferences.push(createDataViewReference(id, layerId));
    }
  }

  return { adHocDataViews, internalReferences };
};

export function buildDatasetStateESQL(layer: TextBasedLayer): DatasetTypeESQL {
  return {
    type: 'esql',
    query: layer.query?.esql ?? '',
  };
}

export function isDataViewSpec(spec: unknown): spec is DataViewSpec {
  return spec != null && typeof spec === 'object' && 'title' in spec;
}

function getReferenceCriteria(layerId: string) {
  return (ref: SavedObjectReference) => ref.name === `${LENS_LAYER_SUFFIX}${layerId}`;
}

export function buildDatasetStateNoESQL(
  layer: FormBasedLayer | Omit<FormBasedLayer, 'indexPatternId'>,
  layerId: string,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences: SavedObjectReference[] = []
): DatasetTypeNoESQL {
  const referenceCriteria = getReferenceCriteria(layerId);
  const adhocReference = adhocReferences?.find(referenceCriteria);

  if (adhocReference && adHocDataViews?.[adhocReference.id]) {
    const dataViewSpec = adHocDataViews[adhocReference.id];
    if (isDataViewSpec(dataViewSpec)) {
      return {
        type: 'index',
        index: dataViewSpec.title!,
        time_field: dataViewSpec.timeFieldName ?? LENS_DEFAULT_TIME_FIELD,
      };
    }
  }

  const reference = references?.find(referenceCriteria);
  if (reference) {
    return {
      type: 'dataView',
      id: reference.id,
    };
  }

  return {
    type: 'dataView',
    id: 'indexPatternId' in layer ? layer.indexPatternId ?? '' : '',
  };
}

/**
 * Builds dataset state from the layer configuration
 *
 * @deprecated use `buildDatasetStateESQL` or `buildDatasetStateNoESQL` instead
 */
export function buildDatasetState(
  layer: FormBasedLayer | Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences: SavedObjectReference[] = []
): DatasetType {
  if (isTextBasedLayer(layer)) {
    return buildDatasetStateESQL(layer);
  }

  return buildDatasetStateNoESQL(layer, layerId, adHocDataViews, references, adhocReferences);
}

// builds Lens State references from list of dataviews
export function buildReferences(dataviews: Record<string, string>): SavedObjectReference[] {
  const references: SavedObjectReference[][] = [];
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
export function getDatasetIndex(dataset: DatasetType) {
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
  layer: unknown,
  i: number,
  dataset: DatasetType,
  datasetIndex: { index: string; timeFieldName: string },
  buildDataLayer: (
    config: unknown,
    i: number,
    index: { index: string; timeFieldName: string }
  ) => FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | undefined,
  getValueColumns: (layer: unknown, i: number) => TextBasedLayerColumn[] // ValueBasedLayerColumn[]
): ['textBased' | 'formBased', DataSourceStateLayer | undefined] {
  function buildValueLayer(
    config: unknown,
    ds: NarrowByType<DatasetType, 'table'>
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
    config: unknown,
    ds: NarrowByType<DatasetType, 'esql'>
  ): TextBasedPersistedState['layers'][0] {
    const columns = getValueColumns(config, i);

    return {
      index: datasetIndex.index,
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
  return ['formBased', buildDataLayer(layer, i, datasetIndex)];
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
  buildDataLayers: (
    config: unknown,
    i: number,
    index: { index: string; timeFieldName: string }
  ) => PersistedIndexPatternLayer | FormBasedPersistedState['layers'] | undefined,
  getValueColumns: (config: any, i: number) => TextBasedLayerColumn[]
) => {
  let layers: Partial<LensAttributes['state']['datasourceStates']> = {};

  // XY charts have dataset encoded per layer not at the root level
  const mainDataset = 'dataset' in config && config.dataset;
  const usedDataviews: Record<
    string,
    | { type: 'dataView'; id: string }
    | { type: 'adHocDataView'; index: string; timeFieldName: string }
  > = {};
  // a few charts types support multiple layers
  const hasMultipleLayers = 'layers' in config;
  const configLayers = hasMultipleLayers ? config.layers : [config];

  for (let i = 0; i < configLayers.length; i++) {
    const layer = configLayers[i];
    const layerId = hasMultipleLayers && 'type' in layer ? `${layer.type}_${i}` : `layer_${i}`;
    const dataset = 'dataset' in layer ? layer.dataset : mainDataset;

    if (!dataset) {
      throw Error('dataset must be defined');
    }

    const index = getDatasetIndex(dataset);

    const [type, layerConfig] = buildDatasourceStatesLayer(
      layer,
      i,
      dataset,
      index!,
      buildDataLayers,
      getValueColumns
    );
    if (layerConfig) {
      layers = {
        ...layers,
        [type]: {
          layers: isSingleLayer(layerConfig)
            ? { ...layers[type]?.layers, [layerId]: layerConfig }
            : // metric chart can return 2 layers (one for the metric and one for the trendline)
              { ...layers[type]?.layers, ...layerConfig },
        },
      };

      // keep record of all dataviews used by layers
      if (index) {
        const newLayerIds =
          isSingleLayer(layerConfig) || Object.keys(layerConfig).length === 0
            ? [layerId]
            : Object.keys(layerConfig);
        for (const id of newLayerIds) {
          usedDataviews[id] =
            dataset.type === 'dataView'
              ? { type: 'dataView', id: dataset.id }
              : {
                  type: 'adHocDataView',
                  ...index,
                };
        }
      }
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
  options: LayerSettingsSchema
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

export const filtersToApiFormat = (
  filters: Filter[]
): (LensApiFilterType | UnifiedSearchFilterType)[] => {
  return filters.map((filter) => {
    const { $state, meta, ...finalFilter } = filter;
    return {
      ...(finalFilter.query?.language ? { language: finalFilter.query?.language } : {}),
      ...('query' in finalFilter
        ? { query: finalFilter.query?.query ?? finalFilter.query }
        : finalFilter),
    };
  });
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

export const filtersToLensState = (
  filters: (LensApiFilterType | UnifiedSearchFilterType)[]
): Required<Filter | Filter['query']>[] => {
  return filters.map((filter) => {
    return {
      ...('query' in filter ? { query: filter.query, language: filter?.language } : filter),
      meta: {},
    };
  });
};

export const queryToLensState = (query: LensApiFilterType): Query => {
  return { query: query.query, language: query.language as 'kuery' | 'lucene' };
};

export const filtersAndQueryToApiFormat = (
  state: LensAttributes
): {
  filters?: (LensApiFilterType | UnifiedSearchFilterType)[];
  query?: LensApiFilterType;
} => {
  return {
    ...(state.state.filters?.length ? { filters: filtersToApiFormat(state.state.filters) } : {}),
    ...(state.state.query && !isOfAggregateQueryType(state.state.query)
      ? { query: queryToApiFormat(state.state.query) }
      : {}),
  };
};

function extraQueryFromAPIState(state: LensApiState): { esql: string } | Query | undefined {
  if ('dataset' in state && state.dataset.type === 'esql') {
    return { esql: state.dataset.query };
  }
  if ('layers' in state && Array.isArray(state.layers)) {
    // pick only the first one for now
    const esqlLayer = state.layers.find(
      (layer): layer is LayerTypeESQL => layer.dataset?.type === 'esql'
    );
    if (esqlLayer && 'query' in esqlLayer.dataset) {
      return { esql: esqlLayer.dataset.query };
    }
  }
  if ('query' in state && state.query) {
    return queryToLensState(state.query satisfies LensApiFilterType);
  }
  return undefined;
}

export const filtersAndQueryToLensState = (state: LensApiState) => {
  const query = extraQueryFromAPIState(state);
  return {
    filters: [] satisfies Filter[],
    // @TODO: rework on these with the shared Filter definition by Presentation team
    ...(state.filters ? { filters: filtersToLensState(state.filters) as Filter[] } : {}),
    ...(query ? { query } : {}),
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

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}
