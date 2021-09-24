/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toArray } from 'lodash';
import { getFormatService } from '../../../services';
import { Table } from '../../types';
import type { Dimensions } from '../../../../../pie/public';
import { getColumnByAccessor, getNextToAccessorColumn } from '../accessor';

interface Slice {
  name: string;
  size: number;
  parent?: Slice;
  children?: [];
  rawData?: {
    table: Table;
    row: number;
    column: number;
    value: string | number | object;
  };
}

export const buildHierarchicalData = (table: Table, { metric, buckets = [] }: Dimensions) => {
  let slices: Slice[];
  const names: { [key: string]: string } = {};
  const metricColumn = getColumnByAccessor(table.columns, metric.accessor);
  const metricFieldFormatter = metric.format;

  if (!buckets.length) {
    slices = [
      {
        name: metricColumn.name,
        size: table.rows[0][metricColumn.id] as number,
      },
    ];
    names[metricColumn.name] = metricColumn.name;
  } else {
    slices = [];
    table.rows.forEach((row, rowIndex) => {
      let parent: Slice;
      let dataLevel = slices;

      buckets.forEach((bucket) => {
        const bucketColumn = getColumnByAccessor(table.columns, bucket.accessor);
        const bucketValueColumn = getNextToAccessorColumn(table.columns, bucket.accessor);
        const bucketFormatter = getFormatService().deserialize(bucket.format);
        const name = bucketFormatter.convert(row[bucketColumn.id]);
        const size = bucketValueColumn ? (row[bucketValueColumn.id] as number) : 0;
        names[name] = name;

        let slice = dataLevel.find((dataLevelSlice) => dataLevelSlice.name === name);
        if (!slice) {
          slice = {
            name,
            size,
            parent,
            children: [],
            rawData: {
              table,
              row: rowIndex,
              column: bucket.accessor,
              value: row[bucketColumn.id],
            },
          };
          dataLevel.push(slice);
        }

        parent = slice;
        dataLevel = slice.children as [];
      });
    });
  }

  return {
    hits: table.rows.length,
    raw: table,
    names: toArray(names),
    tooltipFormatter: metricFieldFormatter,
    slices: {
      children: [...slices],
    },
  };
};
