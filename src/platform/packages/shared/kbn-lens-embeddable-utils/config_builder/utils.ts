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
import type { DataViewSpec, DataView } from '@kbn/data-views-plugin/public';
import type {
  FieldBasedIndexPatternColumn,
  FormBasedLayer,
  FormBasedPersistedState,
  FormulaPublicApi,
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type {
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataViewsCommon } from './config_builder';
import {
  LensAttributes,
  LensDataset,
  LensDatatableDataset,
} from './types';
import { LensApiState } from './schema';
import { fromBreakdownColumn } from './columns';
import { getMetricColumnReverse } from './columns/metric';

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


export const operationFromColumn = (columnId: string, layer: FormBasedLayer, dataViews: DataViewsCommon, formulaAPI?: FormulaPublicApi) => {
  const column = layer.columns[columnId];
  if (!column) {
    return undefined;
  }
  if (['terms', 'filters', 'ranges', 'date_range'].includes(column.operationType)) {
    return fromBreakdownColumn(column as FieldBasedIndexPatternColumn);
  }
  return getMetricColumnReverse(column);;
};

export const buildDatasetState = (layer: FormBasedLayer, dataViews: DataViewsCommon) => {
  return {
    index: layer.indexPatternId || '',
  }
};


export function buildReferences(dataviews: Record<string, DataView>) {
  const references = [];
  for (const layerid in dataviews) {
    if (dataviews[layerid]) {
      references.push(...getDefaultReferences(dataviews[layerid].id!, layerid));
    }
  }
  return references.flat();
}

const getAdhocDataView = (dataView: DataView): Record<string, DataViewSpec> => {
  return {
    [dataView.id ?? uuidv4()]: {
      ...dataView.toSpec(false),
    },
  };
};

export const getAdhocDataviews = (dataviews: Record<string, DataView>) => {
  let adHocDataViews = {};
  [...new Set(Object.values(dataviews))].forEach((d) => {
    adHocDataViews = {
      ...adHocDataViews,
      ...getAdhocDataView(d),
    };
  });

  return adHocDataViews;
};

export function isSingleLayer(
  layer: DataSourceStateLayer
): layer is PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0] {
  return layer && typeof layer === 'object' && ('columnOrder' in layer || 'columns' in layer);
}

export function isFormulaDataset(dataset?: LensDataset) {
  if (dataset && 'index' in dataset) {
    return true;
  }
  return false;
}

/**
 * it loads dataview by id or creates an ad-hoc dataview if index pattern is provided
 * @param index
 * @param dataViewsAPI
 * @param timeField
 */
export async function getDataView(
  index: string,
  dataViewsAPI: DataViewsCommon,
  timeField?: string
) {
  let dataView: DataView;

  try {
    dataView = await dataViewsAPI.get(index, false);
  } catch {
    dataView = await dataViewsAPI.create({
      title: index,
      timeFieldName: timeField || '@timestamp',
    });
  }

  return dataView;
}

export async function getDatasetIndex(dataset?: LensApiState['dataset'], dataViewsAPI?: DataViewsCommon) {
  if (!dataset) return undefined;

  let index: string;
  let timeFieldName: string = '@timestamp';

  if (dataset.type === 'index') {
    index = dataset.index;
    timeFieldName = dataset.time_field || '@timestamp';
  } else if (dataset.type === 'esql') {
    index = getIndexPatternFromESQLQuery(dataset.query); // parseIndexFromQuery(config.dataset.query);
  } else if (dataset.type === 'dataView') {
    if (dataViewsAPI) {
      const dataView = await getDataView(dataset.name, dataViewsAPI);
      if (!dataView) {
        return undefined;
      }
      index = dataView.id!;
      timeFieldName = dataView.timeFieldName!;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }

  return { index, timeFieldName };
}

function buildDatasourceStatesLayer(
  layer: LensApiState,
  i: number,
  dataset: LensApiState['dataset'],
  dataView: DataView | undefined,
  buildDataLayers: (
    config: unknown,
    i: number,
    dataView: DataView
  ) => FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | undefined,
  getValueColumns: (config: unknown, i: number) => TextBasedLayerColumn[] // ValueBasedLayerColumn[]
): ['textBased' | 'formBased', DataSourceStateLayer | undefined] {
  function buildValueLayer(
    config: LensApiState
  ): TextBasedPersistedState['layers'][0] {
    const table = dataset as unknown as LensDatatableDataset;
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
    config: LensApiState
  ): TextBasedPersistedState['layers'][0] {
    const columns = getValueColumns(layer, i) as TextBasedLayerColumn[];

    const newLayer = {
      index: dataView!.id!,
      query: { esql: (dataset as any).query } as AggregateQuery,
      timeField: dataView!.timeFieldName,
      columns,
      allColumns: columns,
    };

    return newLayer;
  }

  if (dataset.type === 'esql') {
    return ['textBased', buildESQLLayer(layer)];
  } else if (dataset.type === 'table') {
    return ['textBased', buildValueLayer(layer)];
  }
  return ['formBased', buildDataLayers(layer, i, dataView!)];
}

/**
 * Builds lens datasource states from LensApiState
 * 
 * @param config lens api state
 * @param dataviews list to which dataviews are added
 * @param buildFormulaLayers function used when dataset type is index or dataView
 * @param getValueColumns function used when dataset type is table or esql
 * @param dataViewsAPI dataViews service
 * @returns lens datasource states
 */
export const buildDatasourceStates = async (
  config: LensApiState,
  dataviews: Record<string, DataView>,
  buildFormulaLayers: (
    config: unknown,
    i: number,
    dataView: DataView
  ) => PersistedIndexPatternLayer | FormBasedPersistedState['layers'] | undefined,
  getValueColumns: (config: any, i: number) => TextBasedLayerColumn[],
  dataViewsAPI: DataViewsCommon
) => {
  let layers: Partial<LensAttributes['state']['datasourceStates']> = {};

  const mainDataset = config.dataset;
  const configLayers = 'layers' in config ? config.layers as LensApiState[] : [config];
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

    const index = await getDatasetIndex(dataset, dataViewsAPI);
    const dataView = index
      ? await getDataView(index.index, dataViewsAPI, index.timeFieldName)
      : undefined;

    const [type, layerConfig] = buildDatasourceStatesLayer(
      layer,
      i,
      dataset,
      dataView,
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

    if (dataView) {
      Object.keys(layers[type]?.layers ?? []).forEach((id) => {
        dataviews[id] = dataView;
      });
    }
  }

  return layers;
};

export const addLayerColumn = (
  layer: PersistedIndexPatternLayer,
  columnName: string,
  config: GenericIndexPatternColumn,
  first = false,
  postfix = ''
) => {
  layer.columns = {
    ...layer.columns,
    [columnName]: config,
  };
  if (first) {
    layer.columnOrder.unshift(columnName);
  } else {
    layer.columnOrder.push(columnName);
  }
};