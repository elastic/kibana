/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { Filter } from '../../../es_query';
import { IAggConfig } from '../../aggs';

const getOtherBucketFilterTerms = (table: Datatable, columnIndex: number, rowIndex: number) => {
  if (rowIndex === -1) {
    return [];
  }

  // get only rows where cell value matches current row for all the fields before columnIndex
  const rows = table.rows.filter((row) => {
    return table.columns.every((column, i) => {
      return row[column.id] === table.rows[rowIndex][column.id] || i >= columnIndex;
    });
  });
  const terms = rows.map((row) => row[table.columns[columnIndex].id]);

  return [
    ...new Set(
      terms.filter((term) => {
        const notOther = term !== '__other__';
        const notMissing = term !== '__missing__';
        return notOther && notMissing;
      })
    ),
  ];
};

export const createFilter = (
  aggConfigs: IAggConfig[],
  table: Datatable,
  columnIndex: number,
  rowIndex: number,
  cellValue: any
) => {
  const column = table.columns[columnIndex];
  const aggConfig = aggConfigs[columnIndex];
  let filter: Filter[] = [];
  const value: any = rowIndex > -1 ? table.rows[rowIndex][column.id] : cellValue;
  if (value === null || value === undefined || !aggConfig.isFilterable()) {
    return;
  }
  if (aggConfig.type.name === 'terms' && aggConfig.params.otherBucket) {
    const terms = getOtherBucketFilterTerms(table, columnIndex, rowIndex);
    filter = aggConfig.createFilter(value, { terms });
  } else {
    filter = aggConfig.createFilter(value);
  }

  if (!filter) {
    return;
  }

  if (!Array.isArray(filter)) {
    filter = [filter];
  }

  return filter;
};
