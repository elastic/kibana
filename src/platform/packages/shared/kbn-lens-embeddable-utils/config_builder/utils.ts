/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { isEqual } from 'lodash';
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
  TextBasedLayer,
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
import { LensApiState, lensApiStateSchema } from './schema';
import { fromBreakdownColumn } from './columns';
import { getMetricColumnReverse } from './columns/metric';
import { UnionType } from '@kbn/config-schema/src/types';

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
  return getMetricColumnReverse(column, layer.columns);;
};

/**
 * Builds dataset state from the layer configuration
 * 
 * @param layer 
 * @param dataViews 
 * @returns 
 */
export const buildDatasetState = (layer: FormBasedLayer | TextBasedLayer, dataViews: DataViewsCommon) => {

  if ('index' in layer) {
    return {
      type: 'esql',
      index: layer.index,
      query: layer.query,
    }
  } else {
    return {
      type: 'index',
      index: (layer as FormBasedLayer).indexPatternId,
      time_field: '@timestamp',
    }
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

/**
 * Gets DataView from the dataset configuration
 * 
 * @param dataset 
 * @param dataViewsAPI 
 * @returns 
 */
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
  config: GenericIndexPatternColumn | GenericIndexPatternColumn[],
  first = false,
  postfix = ''
) => {
  const column = Array.isArray(config) ? config[0] : config;
  const referenceColumn = Array.isArray(config) ? config[1] : undefined;

  layer.columns = {
    ...layer.columns,
    [columnName]: column,
    ...(referenceColumn ? { [`${columnName}_reference`]: referenceColumn } : {}),
  };
  if (first) {
    layer.columnOrder.unshift(columnName);
    if (referenceColumn) {
      layer.columnOrder.unshift(`${columnName}_reference`);
    }
  } else {
    layer.columnOrder.push(columnName);
    if (referenceColumn) {
      layer.columnOrder.push(`${columnName}_reference`);
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
      sampling: options.samplings,
      ignoreGlobalFilters: options.ignore_global_filters,
      columns: {},
      columnOrder: [],
    } as PersistedIndexPatternLayer,
  };
}

export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object
    ? T[P] extends (...args: any[]) => any
      ? T[P] // don't mutate functions
      : DeepMutable<T[P]>
    : T[P];
};


/**
 * Appends all default values from schema to the given metric state
 * 
 * @param state The metric state to append default values to.
 * @returns 
 */
export const appendDefaults = (state: LensApiState): LensApiState => {
  function applyDefaults(schemaNode: any, value: any): any {
    // If the schema node is a maybeType (optional)
    if (schemaNode.maybeType) {
      return applyDefaults(schemaNode.maybeType, value);
    }
    // If the schema node has getPropSchemas, it's an object
    if (typeof schemaNode.getPropSchemas === 'function') {
      const props = schemaNode.getPropSchemas();

      if (value === undefined && schemaNode.options?.defaultValue !== undefined) {
        return schemaNode.options.defaultValue;
      }

      const result: Record<string, any> = { ...value };
      for (const key of Object.keys(props)) {
        const propSchema = props[key];
        const hasValue = value && Object.prototype.hasOwnProperty.call(value, key);
        if (hasValue) {
          // Recurse for nested objects/arrays
          result[key] = applyDefaults(propSchema, value[key]);
        } else if (
          (propSchema.typeOptions && 'defaultValue' in propSchema.typeOptions && propSchema.typeOptions.defaultValue !== undefined) ||
          ('defaultValue' in propSchema && propSchema.defaultValue !== undefined)
        ) {
          // If schema defines a default, use it (prefer typeOptions.defaultValue)
          const def = propSchema.typeOptions && 'defaultValue' in propSchema.typeOptions
            ? propSchema.typeOptions.defaultValue
            : propSchema.defaultValue;
          result[key] = typeof def === 'function' ? def() : def;
        } else {
          // Try recursing with undefined to fill nested defaults
          const nestedDefault = applyDefaults(propSchema, undefined);
          if (nestedDefault !== undefined) {
            result[key] = nestedDefault;
          }
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
    // If the schema node is an arrayType
    if (schemaNode.arrayType) {
      if (Array.isArray(value)) {
        return value.map((item: any) => applyDefaults(schemaNode.arrayType, item));
      } else {
        // If a default is defined for the array itself, use it
        const def = schemaNode.typeOptions && 'defaultValue' in schemaNode.typeOptions
          ? schemaNode.typeOptions.defaultValue
          : undefined;
        if (def !== undefined) {
          return typeof def === 'function' ? def() : def;
        }
        return [];
      }
    }
    // If the schema node is an array
    if (typeof schemaNode.getItemSchema === 'function') {
      if (Array.isArray(value)) {
        return value.map((item: any) => applyDefaults(schemaNode.getItemSchema(), item));
      } else {
        return [];
      }
    }
    // If the schema node is a oneOf/union (UnionType)
    if (Array.isArray(schemaNode.unionTypes)) {
      const schemas = schemaNode.unionTypes;
      if (value !== undefined) {
        for (const s of schemas) {
          try {
            // Validate value against schema; if no error, use it
            s.validate(value);
            return applyDefaults(s, value);
          } catch (e) {
            // Try next
            console.log(e);
          }
        }
      }
      // Otherwise, try to return the default of the first schema with a default
      for (const s of schemas) {
        const def = s.typeOptions && 'defaultValue' in s.typeOptions
          ? s.typeOptions.defaultValue
          : s.defaultValue;
        if (def !== undefined) {
          return typeof def === 'function' ? def() : def;
        }
      }
      return undefined;
    }
    // For primitives (string, number, boolean, literal, etc.)
    if (value !== undefined) {
      return value;
    }
    // Check for defaultValue in typeOptions first
    if (schemaNode.typeOptions && 'defaultValue' in schemaNode.typeOptions && schemaNode.typeOptions.defaultValue !== undefined) {
      const def = schemaNode.typeOptions.defaultValue;
      return typeof def === 'function' ? def() : def;
    }
    if ('defaultValue' in schemaNode && schemaNode.defaultValue !== undefined) {
      return typeof schemaNode.defaultValue === 'function' ? schemaNode.defaultValue() : schemaNode.defaultValue;
    }
    if (schemaNode.getSchema()._flags.default !== undefined) {
      return schemaNode.getSchema()._flags.default;
    }
    return undefined;
  }

  return applyDefaults(lensApiStateSchema, state) as LensApiState;
};


/**
 * Strips all default values from the given metric state
 *  * @param state The metric state to strip default values from.
 * @returns 
 */
export const stripDefaults = (state: LensApiState): LensApiState => {
  function strip(schemaNode: any, value: any): any {
    if (schemaNode.maybeType) {
      return strip(schemaNode.maybeType, value);
    }
    // If the schema node has getPropSchemas, it's an object
    if (typeof schemaNode.getPropSchemas === 'function') {
      if (isEqual(value, schemaNode.options?.defaultValue)) {
        return undefined;
      }
      const props = schemaNode.getPropSchemas();
      const result: Record<string, any> = {};
      let hasAny = false;
      for (const key of Object.keys(props)) {
        const propSchema = props[key];
        if (value && Object.prototype.hasOwnProperty.call(value, key)) {
          const stripped = strip(propSchema, value[key]);
          // Remove key if stripped is undefined or equal to default
          if (stripped !== undefined) {
            result[key] = stripped;
            hasAny = true;
          }
        }
      }
      return hasAny ? result : undefined;
    }
    // If the schema node is an array
    if (typeof schemaNode.getItemSchema === 'function') {
      if (Array.isArray(value)) {
        const strippedArr = value
          .map((item: any) => strip(schemaNode.getItemSchema(), item))
          .filter((item: any) => item !== undefined);
        return strippedArr.length > 0 ? strippedArr : undefined;
      }
      return undefined;
    }
    // If the schema node is an arrayType
    if (schemaNode.arrayType) {
      if (Array.isArray(value)) {
        const stripped = value.map((item: any) => strip(schemaNode.arrayType, item));
        return stripped.every((v) => v === undefined) ? undefined : stripped;
      }
      return undefined;
    }
    // If the schema node is an array
    if (typeof schemaNode.getItemSchema === 'function') {
      if (Array.isArray(value)) {
        const stripped = value.map((item: any) => strip(schemaNode.getItemSchema(), item));
        return stripped.every((v) => v === undefined) ? undefined : stripped;
      }
      return undefined;
    }
    // If the schema node is a oneOf/union (UnionType)
    if (Array.isArray(schemaNode.unionTypes)) {
      const schemas = schemaNode.unionTypes;
      if (value !== undefined) {
        for (const s of schemas) {
          try {
            s.validate(value);
            return strip(s, value);
          } catch (e) {
            // Try next
            console.log(e);
          }
        }
      }
      return undefined;
    }
    // For primitives (string, number, boolean, literal, etc.)
    if (value !== undefined) {
      // Prefer typeOptions.defaultValue, then defaultValue, then Joi _flags.default
      let def;
      if (schemaNode.typeOptions && 'defaultValue' in schemaNode.typeOptions && schemaNode.typeOptions.defaultValue !== undefined) {
        def = typeof schemaNode.typeOptions.defaultValue === 'function' ? schemaNode.typeOptions.defaultValue() : schemaNode.typeOptions.defaultValue;
      } else if ('defaultValue' in schemaNode && schemaNode.defaultValue !== undefined) {
        def = typeof schemaNode.defaultValue === 'function' ? schemaNode.defaultValue() : schemaNode.defaultValue;
      } else if (typeof schemaNode.getSchema === 'function' && schemaNode.getSchema()._flags.default !== undefined) {
        def = schemaNode.getSchema()._flags.default;
      }
      if (def !== undefined && value === def) {
        return undefined;
      }
      return value;
    }
    return undefined;
  }

  return strip(lensApiStateSchema, state) as LensApiState;
}