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
  FormBasedPersistedState,
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';
import type {
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DataViewsCommon } from './types';
import type {
  FormulaValueConfig,
  LensAnnotationLayer,
  LensAttributes,
  LensBaseConfig,
  LensBaseLayer,
  LensBaseXYLayer,
  LensConfig,
  LensDataset,
  LensDatatableDataset,
  LensDataviewDataset,
  LensESQLDataset,
} from './types';
import type { LensApiState } from './schema';

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

export function mapToFormula(layer: LensBaseLayer): FormulaValueConfig {
  const { label, decimals, format, compactValues: compact, normalizeByUnit, value } = layer;

  const formulaFormat: FormulaValueConfig['format'] | undefined = format
    ? {
        id: format,
        params: {
          decimals: decimals ?? 2,
          ...(!!compact ? { compact } : undefined),
        },
      }
    : undefined;

  return {
    formula: value,
    label,
    timeScale: normalizeByUnit,
    format: formulaFormat,
  };
}

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

/**
 * Retrieves an existing data view by its title (index) or creates an Ad-Hoc Dataview if it does not exist.
 *
 * Behavior:
 * - If an explicit `id` is provided, a new ad-hoc data view is picked from the cache or created with that `id`.
 * - If no `id` is provided, the function first attempts to retrieve an existing data view whose id matches `index`.
 *   - If retrieval succeeds, the existing data view is returned.
 *   - If retrieval fails (e.g. it does not exist), a new data view is created using `index` as the title.
 *
 * @param params.index The index pattern or title to use for lookup or creation.
 * @param params.timeFieldName The name of the time field to associate with the data view.
 * @param dataViewsAPI The DataViews service API used to get or create data views.
 * @param id Optional explicit id to assign to the data view; if provided, creation is forced.
 * @returns A promise resolving to the retrieved or newly created data view.
 * @throws Re-throws any error coming from the underlying DataViews API when creation fails.
 */
export async function getDataView(
  { index, timeFieldName }: { index: string; timeFieldName: string },
  dataViewsAPI: DataViewsCommon,
  id?: string
) {
  if (id) {
    return dataViewsAPI.create({ id, title: index, timeFieldName });
  }
  try {
    return await dataViewsAPI.get(index, false);
  } catch {
    return dataViewsAPI.create({ title: index, timeFieldName });
  }
}

export function getDatasetIndex(dataset: LensDataset) {
  if (isDataViewDataset(dataset)) {
    return { index: dataset.index, timeFieldName: dataset.timeFieldName ?? '@timestamp' };
  } else if (isESQLDataset(dataset)) {
    return { index: getIndexPatternFromESQLQuery(dataset.esql), timeFieldName: '@timestamp' };
  }
}

function buildDatasourceStatesLayer(
  layer: LensBaseLayer | LensBaseXYLayer,
  i: number,
  dataset: LensDataset,
  dataView: DataView | undefined,
  buildFormulaLayers: (
    config: unknown,
    i: number,
    dataView: DataView
  ) => FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | undefined,
  getValueColumns: (config: unknown, i: number) => TextBasedLayerColumn[] // ValueBasedLayerColumn[]
): ['textBased' | 'formBased', DataSourceStateLayer | undefined] {
  function buildValueLayer(
    config: LensBaseLayer | LensBaseXYLayer
  ): TextBasedPersistedState['layers'][0] {
    const table = dataset as LensDatatableDataset;
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
    config: LensBaseLayer | LensBaseXYLayer
  ): TextBasedPersistedState['layers'][0] {
    const columns = getValueColumns(layer, i);

    const newLayer = {
      index: dataView!.id!,
      query: { esql: (dataset as LensESQLDataset).esql } as AggregateQuery,
      timeField: dataView!.timeFieldName,
      columns,
      allColumns: columns,
    };

    return newLayer;
  }

  if (isESQLDataset(dataset)) {
    return ['textBased', buildESQLLayer(layer)];
  } else if ('type' in dataset) {
    return ['textBased', buildValueLayer(layer)];
  }
  return ['formBased', buildFormulaLayers(layer, i, dataView!)];
}
export const buildDatasourceStates = async (
  config: (LensBaseConfig & { layers: LensBaseXYLayer[] }) | (LensBaseLayer & LensBaseConfig),
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
  const configLayers = 'layers' in config ? config.layers : [config];
  for (let i = 0; i < configLayers.length; i++) {
    const layer = configLayers[i];
    const layerId = `layer_${i}`;
    const dataset = layer.dataset ?? mainDataset;

    if (!dataset && 'type' in layer && (layer as LensAnnotationLayer).type !== 'annotation') {
      throw Error('dataset must be defined');
    }
    if (dataset) {
      const index = getDatasetIndex(dataset);

      const dataView = index
        ? await getDataView(
            index,
            dataViewsAPI,
            isESQLDataset(dataset) ? JSON.stringify(index) : undefined
          )
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
  }

  return layers;
};

export const addLayerColumn = (
  layer: PersistedIndexPatternLayer,
  columnName: string,
  config: GenericIndexPatternColumn,
  first = false
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

export const addLayerFormulaColumns = (
  layer: PersistedIndexPatternLayer,
  columns: PersistedIndexPatternLayer,
  postfix = ''
) => {
  const altObj = Object.fromEntries(
    Object.entries(columns.columns).map(([key, value]) =>
      // Modify key here
      [`${key}${postfix}`, value]
    )
  );

  layer.columns = {
    ...layer.columns,
    ...altObj,
  };
  layer.columnOrder.push(...columns.columnOrder.map((c) => `${c}${postfix}`));
};

function isESQLDataset(dataset: LensDataset): dataset is LensESQLDataset {
  return 'esql' in dataset;
}
export function isDataViewDataset(dataset: LensDataset): dataset is LensDataviewDataset {
  return 'index' in dataset;
}

export function isLensAPIFormat(config: unknown): config is LensApiState {
  return typeof config === 'object' && config !== null && 'type' in config;
}

export function isLensLegacyFormat(config: unknown): config is LensConfig {
  return typeof config === 'object' && config !== null && 'chartType' in config;
}

export function isLensLegacyAttributes(config: unknown): config is LensAttributes {
  return (
    typeof config === 'object' && config !== null && 'state' in config && 'references' in config
  );
}
