/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getServices } from '../../kibana_services';
import { buildPointSeriesData } from './helpers';

function tableResponseHandler(table: any, dimensions: any) {
  const converted = { tables: [] } as any;
  const split = dimensions.splitColumn || dimensions.splitRow;

  if (split) {
    converted.direction = dimensions.splitRow ? 'row' : 'column';
    const splitColumnIndex = split[0].accessor;
    const splitColumnFormatter = getServices().data.fieldFormats.deserialize(split[0].format);
    const splitColumn = table.columns[splitColumnIndex];
    const splitMap = {};
    let splitIndex = 0;

    table.rows.forEach((row: any, rowIndex: any) => {
      const splitValue = row[splitColumn.id] as any;

      if (!splitMap.hasOwnProperty(splitValue)) {
        // @ts-ignore
        splitMap[splitValue] = splitIndex++;
        const tableGroup = {
          $parent: converted,
          title: `${splitColumnFormatter.convert(splitValue)}: ${splitColumn.name}`,
          name: splitColumn.name,
          key: splitValue,
          column: splitColumnIndex,
          row: rowIndex,
          table,
          tables: [],
        };

        tableGroup.tables.push({
          // @ts-ignore
          $parent: tableGroup,
          // @ts-ignore
          columns: table.columns,
          // @ts-ignore
          rows: [],
        });

        converted.tables.push(tableGroup);
      }

      // @ts-ignore
      const tableIndex = splitMap[splitValue];
      converted.tables[tableIndex].tables[0].rows.push(row);
    });
  } else {
    converted.tables.push({
      columns: table.columns,
      rows: table.rows,
    });
  }

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

export const discoverResponseHandler = (response: any, dimensions: any) => {
  const tableGroup = tableResponseHandler(response, dimensions);

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
