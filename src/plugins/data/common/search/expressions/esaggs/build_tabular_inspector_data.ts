/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import {
  FormattedData,
  TabularData,
  TabularDataValue,
} from '../../../../../../plugins/inspector/common';
import { Filter } from '../../../es_query';
import { FormatFactory } from '../../../field_formats/utils';
import { TabbedTable } from '../../tabify';
import { createFilter } from './create_filter';

/**
 * Type borrowed from the client-side FilterManager['addFilters'].
 *
 * We need to use a custom type to make this isomorphic since FilterManager
 * doesn't exist on the server.
 *
 * @internal
 */
export type AddFilters = (filters: Filter[] | Filter, pinFilterStatus?: boolean) => void;

/**
 * This function builds tabular data from the response and attaches it to the
 * inspector. It will only be called when the data view in the inspector is opened.
 *
 * @internal
 */
export async function buildTabularInspectorData(
  table: TabbedTable,
  {
    addFilters,
    deserializeFieldFormat,
  }: {
    addFilters?: AddFilters;
    deserializeFieldFormat: FormatFactory;
  }
): Promise<TabularData> {
  const aggConfigs = table.columns.map((column) => column.aggConfig);
  const rows = table.rows.map((row) => {
    return table.columns.reduce<Record<string, FormattedData>>((prev, cur, colIndex) => {
      const value = row[cur.id];

      let format = cur.aggConfig.toSerializedFieldFormat();
      if (Object.keys(format).length < 1) {
        // If no format exists, fall back to string as a default
        format = { id: 'string' };
      }
      const fieldFormatter = deserializeFieldFormat(format);

      prev[`col-${colIndex}-${cur.aggConfig.id}`] = new FormattedData(
        value,
        fieldFormatter.convert(value)
      );
      return prev;
    }, {});
  });

  const columns = table.columns.map((col, colIndex) => {
    const field = col.aggConfig.getField();
    const isCellContentFilterable = col.aggConfig.isFilterable() && (!field || field.filterable);
    return {
      name: col.name,
      field: `col-${colIndex}-${col.aggConfig.id}`,
      filter:
        addFilters &&
        isCellContentFilterable &&
        ((value: TabularDataValue) => {
          const rowIndex = rows.findIndex(
            (row) => row[`col-${colIndex}-${col.aggConfig.id}`].raw === value.raw
          );
          const filter = createFilter(aggConfigs, table, colIndex, rowIndex, value.raw);

          if (filter) {
            addFilters(filter);
          }
        }),
      filterOut:
        addFilters &&
        isCellContentFilterable &&
        ((value: TabularDataValue) => {
          const rowIndex = rows.findIndex(
            (row) => row[`col-${colIndex}-${col.aggConfig.id}`].raw === value.raw
          );
          const filter = createFilter(aggConfigs, table, colIndex, rowIndex, value.raw);

          if (filter) {
            const notOther = value.raw !== '__other__';
            const notMissing = value.raw !== '__missing__';
            if (Array.isArray(filter)) {
              filter.forEach((f) => set(f, 'meta.negate', notOther && notMissing));
            } else {
              set(filter, 'meta.negate', notOther && notMissing);
            }
            addFilters(filter);
          }
        }),
    };
  });

  return { columns, rows };
}
