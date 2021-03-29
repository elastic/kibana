/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildPointSeriesData } from './helpers';
import { Dimensions } from './helpers/point_series';

function tableResponseHandler(table: any) {
  const converted = { tables: [], direction: '' };

  converted.tables.push({
    // @ts-ignore
    columns: table.columns,
    // @ts-ignore
    rows: table.rows,
  });

  return converted;
}

function convertTableGroup(tableGroup: any, convertTable: any) {
  const tables = tableGroup.tables;

  if (!tables.length) return;

  const firstChild = tables[0];
  if (firstChild.columns) {
    const chart = convertTable(firstChild);
    // if chart is within a split, assign group title to its label
    if (tableGroup.$parent) {
      chart.label = tableGroup.title;
    }
    return chart;
  }

  const out = {};
  let outList: any;

  tables.forEach(function (table: any) {
    if (!outList) {
      const direction = tableGroup.direction === 'row' ? 'rows' : 'columns';
      // @ts-ignore
      outList = out[direction] = [];
    }

    let output;
    if ((output = convertTableGroup(table, convertTable))) {
      outList.push(output);
    }
  });

  return out;
}

export const discoverResponseHandler = (response: any, dimensions: Dimensions) => {
  const tableGroup = tableResponseHandler(response);

  let converted = convertTableGroup(tableGroup, (table: any) => {
    return buildPointSeriesData(table, dimensions);
  });
  if (!converted) {
    // mimic a row of tables that doesn't have any tables
    // https://github.com/elastic/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
    converted = { rows: [] };
  }

  converted.hits = response.rows.length;

  return converted;
};
