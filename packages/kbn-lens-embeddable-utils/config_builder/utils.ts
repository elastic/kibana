/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {SavedObjectReference} from "@kbn/core-saved-objects-common/src/server_types";
import {DataViewSpec, DataView, DataViewsPublicPluginStart} from "@kbn/data-views-plugin/public";
import { v4 as uuidv4 } from 'uuid';
import {GenericIndexPatternColumn, PersistedIndexPatternLayer} from "@kbn/lens-plugin/public";

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

export const getAdhocDataView = (dataView: DataView): Record<string, DataViewSpec> => {
    return {
        [dataView.id ?? uuidv4()]: {
            ...dataView.toSpec(),
        },
    };
};

/**
 * it loads dataview by id or creates an ad-hoc dataview if index pattern is provided
 * @param index
 * @param dataViewsAPI
 * @param timeField
 */
export async function getDataView(index: string, dataViewsAPI: DataViewsPublicPluginStart, timeField?: string) {
  let dataView: DataView;

  try {
    dataView = await dataViewsAPI.get(index, false);
  } catch {
    dataView = await dataViewsAPI.create({
      title: index,
      timeFieldName: timeField || '@timestamp'
    });
  }

  return dataView;
}

export const addLayerColumn = (layer: PersistedIndexPatternLayer, columnName: string, config: GenericIndexPatternColumn, first = false) => {
  layer.columns = {
    ...layer.columns,
    [columnName]: config,
  }
  if (first) {
    layer.columnOrder.unshift(columnName);
  } else {
    layer.columnOrder.push(columnName);
  }
}

export const addLayerFormulaColumns = (layer: PersistedIndexPatternLayer, columns: PersistedIndexPatternLayer, postfix = '') => {
  const altObj = Object.fromEntries(
    Object.entries(columns.columns).map(([key, value]) =>
      // Modify key here
      [`${key}${postfix}`, value]
    )
  )

  layer.columns = {
    ...layer.columns,
    ...altObj,
  };
  layer.columnOrder.push(...columns.columnOrder.map((c) => `${c}${postfix}`));
}
