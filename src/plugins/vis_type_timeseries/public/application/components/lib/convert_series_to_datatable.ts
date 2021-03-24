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
import { PanelData } from '../../../../common/types';
import { X_ACCESSOR_INDEX } from '../../visualizations/constants';

interface TSVBTables {
  [key: string]: Datatable;
}

export const convertSeriesToDataTable = (
  model: TimeseriesVisParams,
  series: PanelData[],
  indexPattern: IndexPattern[]
) => {
  const tables: TSVBTables = {};

  for (let i = 0; i < model.series.length; i++) {
    const modelSeries = model.series[i];
    const seriesPerModel = series.filter((s) => s.seriesId === modelSeries.id);
    let id = X_ACCESSOR_INDEX;
    const columns = [
      { id, name: model.time_field ?? (model.default_timefield || ''), isSplit: false },
    ];
    const isSplitByTerms = seriesPerModel[0].isSplitByTerms;
    if (seriesPerModel.length) {
      id++;
      columns.push({ id, name: seriesPerModel[0].splitByLabel, isSplit: false });
      if (isSplitByTerms) {
        id++;
        columns.push({ id, name: modelSeries.terms_field || '', isSplit: true });
      }
    }
    const columnsWithMeta: DatatableColumn[] = columns.map((column) => {
      const field = indexPattern[0].getFieldByName(column.name);
      const type = (field?.spec.type as DatatableColumnType) || 'number';
      const cleanedColumn = {
        id: column.id.toString(),
        name: column.name,
        meta: {
          type,
          field: column.name,
          index: model.index_pattern ?? model.default_index_pattern,
          source: 'esaggs',
          sourceParams: {
            enabled: true,
            indexPatternId: indexPattern[0]?.id,
            type:
              type === 'date'
                ? 'date_histogram'
                : column.isSplit
                ? 'terms'
                : modelSeries.metrics[0].type,
          },
        },
      };
      return cleanedColumn;
    });
    let rows: DatatableRow[] = [];
    for (let j = 0; j < seriesPerModel.length; j++) {
      const data = seriesPerModel[j].data.map((row) => {
        const t: DatatableRow = [row[0], row[1]];
        if (seriesPerModel[j].isSplitByTerms) {
          t.push(seriesPerModel[j].label);
        }
        return t;
      });
      rows = [...rows, ...data];
    }
    tables[modelSeries.id] = {
      type: 'datatable',
      rows,
      columns: columnsWithMeta,
    };
  }
  return tables;
};
