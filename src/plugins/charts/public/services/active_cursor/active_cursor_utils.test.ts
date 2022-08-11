/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseSyncOptions } from './active_cursor_utils';
import type { Datatable } from '@kbn/expressions-plugin/public';

describe('active_cursor_utils', () => {
  describe('parseSyncOptions', () => {
    describe('dateHistogramSyncOption', () => {
      test('should return isDateHistogram true in case if that mode is active', () => {
        expect(parseSyncOptions({ isDateHistogram: true })).toMatchInlineSnapshot(`
          Object {
            "isDateHistogram": true,
          }
        `);
      });

      test('should return isDateHistogram false for other cases', () => {
        expect(parseSyncOptions({ datatables: [] as Datatable[] })).toMatchInlineSnapshot(`
          Object {
            "accessors": Array [],
            "isDateHistogram": false,
          }
        `);
      });
    });

    describe('datatablesSyncOption', () => {
      test('should extract accessors', () => {
        expect(
          parseSyncOptions({
            datatables: [
              {
                columns: [
                  {
                    meta: {
                      index: 'foo_index',
                      field: 'foo_field',
                    },
                  },
                ],
              },
            ] as unknown as Datatable[],
          }).accessors
        ).toMatchInlineSnapshot(`
          Array [
            "foo_index:foo_field",
          ]
        `);
      });

      test('should return isDateHistogram true in case all datatables is time based', () => {
        expect(
          parseSyncOptions({
            datatables: [
              {
                columns: [
                  {
                    meta: {
                      index: 'foo_index',
                      field: 'foo_field',
                      sourceParams: {
                        appliedTimeRange: {},
                      },
                    },
                  },
                ],
              },
              {
                columns: [
                  {
                    meta: {
                      index: 'foo_index1',
                      field: 'foo_field1',
                      sourceParams: {
                        appliedTimeRange: {},
                      },
                    },
                  },
                ],
              },
            ] as unknown as Datatable[],
          })
        ).toMatchInlineSnapshot(`
          Object {
            "accessors": Array [
              "foo_index:foo_field",
              "foo_index1:foo_field1",
            ],
            "isDateHistogram": true,
          }
        `);
      });

      test('should return isDateHistogram false in case of not all datatables is time based', () => {
        expect(
          parseSyncOptions({
            datatables: [
              {
                columns: [
                  {
                    meta: {
                      index: 'foo_index',
                      field: 'foo_field',
                      sourceParams: {
                        appliedTimeRange: {},
                      },
                    },
                  },
                ],
              },
              {
                columns: [
                  {
                    meta: {
                      index: 'foo_index1',
                      field: 'foo_field1',
                    },
                  },
                ],
              },
            ] as unknown as Datatable[],
          })
        ).toMatchInlineSnapshot(`
          Object {
            "accessors": Array [
              "foo_index:foo_field",
              "foo_index1:foo_field1",
            ],
            "isDateHistogram": false,
          }
        `);
      });
    });
  });
});
