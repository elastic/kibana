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
} from '@kbn/lens-plugin/public';
import type {
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { LensAttributes, LensDatatableDataset } from '../types';
import type { LensApiState, NarrowByType } from '../schema';
import { fromBucketLensStateToAPI } from './columns/buckets';
import { getMetricApiColumnFromLensState } from './columns/metric';
import type {
  AnyLensStateColumn,
  AnyBucketLensStateColumn,
  AnyMetricLensStateColumn,
} from './columns/types';

type DataSourceStateLayer =
  | FormBasedPersistedState['layers'] // metric chart can return 2 layers (one for the metric and one for the trendline)
  | PersistedIndexPatternLayer
  | TextBasedPersistedState['layers'][0];

export const getDefaultReferences = (
  index: string,
  dataLayerId: string
): SavedObjectReference[] => {
  return [
    {
      type: 'index-pattern',
      id: index,
      name: `indexpattern-datasource-layer-${dataLayerId}`,
    },
  ];
};

/**
 * given Lens State layer and column id, returns the corresponding Lens API operation
 * @param columnId
 * @param layer
 * @returns
 */
export const operationFromColumn = (columnId: string, layer: FormBasedLayer) => {
  const column = layer.columns[columnId];
  if (!column) {
    return undefined;
  }
  // map columns to array of { column, id }
  const columnMap = Object.entries(layer.columns).map(([id, c]) => ({
    column: c as AnyLensStateColumn,
    id,
  }));
  if (['terms', 'filters', 'ranges', 'date_range'].includes(column.operationType)) {
    return fromBucketLensStateToAPI(column as AnyBucketLensStateColumn, columnMap);
  }
  return getMetricApiColumnFromLensState(
    column as AnyMetricLensStateColumn,
    layer.columns as Record<string, AnyMetricLensStateColumn>
  );
};

/**
 * Builds dataset state from the layer configuration
 *
 * @param layer
 * @returns
 */
export const buildDatasetState = (layer: FormBasedLayer | TextBasedLayer) => {
  if ('index' in layer) {
    return {
      type: 'esql',
      index: layer.index,
      query: layer.query,
    };
  } else {
    return {
      type: 'index',
      index: (layer as FormBasedLayer).indexPatternId,
      time_field: '@timestamp',
    };
  }
};

// builds Lens State references from list of dataviews
export function buildReferences(dataviews: Record<string, string>) {
  const references = [];
  for (const layerid in dataviews) {
    if (dataviews[layerid]) {
      references.push(...getDefaultReferences(dataviews[layerid], layerid));
    }
  }
  return references.flat();
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
  let index: string;
  let timeFieldName: string = '@timestamp';

  if (dataset.type === 'index') {
    index = dataset.index;
    timeFieldName = dataset.time_field || '@timestamp';
  } else if (dataset.type === 'esql') {
    index = getIndexPatternFromESQLQuery(dataset.query); // parseIndexFromQuery(config.dataset.query);
  } else if (dataset.type === 'dataView') {
    index = dataset.name;
  } else {
    return undefined;
  }

  return { index, timeFieldName };
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
      columns: getValueColumns(layer, i),
      allColumns: table.columns.map(
        (column) =>
          ({
            fieldName: column.name,
            columnId: column.id,
            meta: column.meta,
          } as TextBasedLayerColumn)
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
    const columns = getValueColumns(layer, i) as TextBasedLayerColumn[];

    const newLayer = {
      index: index.index,
      query: { esql: ds.query } as AggregateQuery,
      timeField: '@timestamp',
      columns,
      allColumns: columns,
    };

    return newLayer;
  }

  if (dataset.type === 'esql') {
    return ['textBased', buildESQLLayer(layer, dataset)];
  } else if (dataset.type === 'table') {
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
export const buildDatasourceStates = async (
  config: LensApiState,
  dataviews: Record<string, { index: string; timeFieldName: string }>,
  buildFormulaLayers: (
    config: unknown,
    i: number,
    index: { index: string; timeFieldName: string }
  ) => PersistedIndexPatternLayer | FormBasedPersistedState['layers'] | undefined,
  getValueColumns: (config: any, i: number) => TextBasedLayerColumn[]
) => {
  let layers: Partial<LensAttributes['state']['datasourceStates']> = {};

  const mainDataset = config.dataset;
  // a few charts types support multiple layers
  const configLayers = 'layers' in config ? (config.layers as LensApiState[]) : [config];
  for (let i = 0; i < configLayers.length; i++) {
    const layer = configLayers[i];
    const layerId = `layer_${i}`;
    const dataset = layer.dataset || mainDataset;

    // if (!dataset && 'type' in layer && layer.type !== 'annotation') {
    //   throw Error('dataset must be defined');
    // }
    if (!dataset) {
      throw Error('dataset must be defined');
    }

    const index = await getDatasetIndex(dataset);

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
        dataviews[id] = index;
      });
    }
  }

  return layers;
};

// adds new column to existing layer
export const addLayerColumn = (
  layer: PersistedIndexPatternLayer,
  columnName: string,
  config: GenericIndexPatternColumn | GenericIndexPatternColumn[],
  first = false,
  postfix = ''
) => {
  const column = Array.isArray(config) ? config[0] : config;
  const referenceColumn = Array.isArray(config) ? config[1] : undefined;
  const name = columnName + postfix;

  layer.columns = {
    ...layer.columns,
    [name]: column,
    ...(referenceColumn ? { [`${name}_reference`]: referenceColumn } : {}),
  };
  if (first) {
    layer.columnOrder.unshift(name);
    if (referenceColumn) {
      layer.columnOrder.unshift(`${name}_reference`);
    }
  } else {
    layer.columnOrder.push(name);
    if (referenceColumn) {
      layer.columnOrder.push(`${name}_reference`);
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
export const generateLayer = (id: string, options: LensApiState) => {
  return {
    [id]: {
      sampling: options.sampling,
      ignoreGlobalFilters: options.ignore_global_filters,
      columns: {},
      columnOrder: [],
    } as PersistedIndexPatternLayer,
  };
};

export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object
    ? T[P] extends (...args: any[]) => any
      ? T[P] // don't mutate functions
      : DeepMutable<T[P]>
    : T[P];
};
