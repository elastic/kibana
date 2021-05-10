/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern } from 'src/plugins/data/public';
import {
  Datatable,
  DatatableRow,
  DatatableColumn,
  DatatableColumnType,
} from 'src/plugins/expressions/public';
import { TimeseriesVisParams } from '../../../types';
import type { PanelData } from '../../../../common/types';
import { fetchIndexPattern } from '../../../../common/index_patterns_utils';
import { getDataStart } from '../../../services';
import { X_ACCESSOR_INDEX } from '../../visualizations/constants';

interface TSVBTables {
  [key: string]: Datatable;
}

interface TSVBColumns {
  id: number;
  name: string;
  isSplit: boolean;
}

export const addMetaToColumns = (
  columns: TSVBColumns[],
  indexPattern: IndexPattern,
  metricsType: string
): DatatableColumn[] => {
  return columns.map((column) => {
    const field = indexPattern.getFieldByName(column.name);
    const type = (field?.spec.type as DatatableColumnType) || 'number';
    const cleanedColumn = {
      id: column.id.toString(),
      name: column.name,
      meta: {
        type,
        field: column.name,
        index: indexPattern.title,
        source: 'esaggs',
        sourceParams: {
          enabled: true,
          indexPatternId: indexPattern?.id,
          type: type === 'date' ? 'date_histogram' : column.isSplit ? 'terms' : metricsType,
        },
      },
    };
    return cleanedColumn;
  });
};

export const convertSeriesToDataTable = async (
  model: TimeseriesVisParams,
  series: PanelData[],
  initialIndexPattern: IndexPattern
) => {
  const tables: TSVBTables = {};
  const { indexPatterns } = getDataStart();
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
    let usedIndexPattern = initialIndexPattern;
    // The user can overwrite the index pattern of a layer.
    // In that case, the index pattern should be fetched again.
    if (layer.override_index_pattern) {
      const { indexPattern } = await fetchIndexPattern(layer.series_index_pattern, indexPatterns);
      if (indexPattern) {
        usedIndexPattern = indexPattern;
      }
    }
    const isGroupedByTerms = layer.split_mode === 'terms';
    const seriesPerLayer = series.filter((s) => s.seriesId === layer.id);
    let id = X_ACCESSOR_INDEX;

    const columns: TSVBColumns[] = [
      { id, name: usedIndexPattern.timeFieldName || '', isSplit: false },
    ];
    if (seriesPerLayer.length) {
      id++;
      columns.push({ id, name: seriesPerLayer[0].splitByLabel, isSplit: false });
      // Adds an extra column, if the layer is split by terms aggregation
      if (isGroupedByTerms) {
        id++;
        columns.push({ id, name: layer.terms_field || '', isSplit: true });
      }
    }
    const columnsWithMeta = addMetaToColumns(columns, usedIndexPattern, layer.metrics[0].type);

    let rows: DatatableRow[] = [];
    for (let j = 0; j < seriesPerLayer.length; j++) {
      const data = seriesPerLayer[j].data.map((rowData) => {
        const row: DatatableRow = [rowData[0], rowData[1]];
        // If the layer is split by terms aggregation, the data array should also contain the split value.
        if (isGroupedByTerms) {
          row.push(seriesPerLayer[j].label);
        }
        return row;
      });
      rows = [...rows, ...data];
    }
    tables[layer.id] = {
      type: 'datatable',
      rows,
      columns: columnsWithMeta,
    };
  }
  return tables;
};
