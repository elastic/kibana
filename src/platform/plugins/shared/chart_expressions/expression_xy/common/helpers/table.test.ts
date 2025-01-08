/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { Datatable } from '@kbn/expressions-plugin/common';
import { normalizeTable } from './table';
import { createSampleDatatableWithRows } from '../__mocks__';

describe('#normalizeTable', () => {
  it('should convert row values from date string to number if xAccessor related to `date` column', () => {
    const xAccessor = 'c';
    const data = createSampleDatatableWithRows([
      { a: 1, b: 2, c: '2022-05-07T06:25:00.000', d: 'Foo' },
      { a: 1, b: 2, c: '2022-05-08T06:25:00.000', d: 'Foo' },
      { a: 1, b: 2, c: '2022-05-09T06:25:00.000', d: 'Foo' },
    ]);
    const newData = {
      ...data,
      type: 'datatable',

      columns: data.columns.map((c) =>
        c.id !== 'c'
          ? c
          : {
              ...c,
              meta: {
                type: 'date',
              },
            }
      ),
    } as Datatable;
    const expectedData = {
      ...newData,
      rows: newData.rows.map((row) => ({
        ...row,
        [xAccessor as string]: moment(row[xAccessor as string]).valueOf(),
      })),
    };
    const normalizedTable = normalizeTable(newData, xAccessor);
    expect(normalizedTable).toEqual(expectedData);
  });
});
