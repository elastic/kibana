/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of, Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { Datatable } from '../../../expression_types';
import { mapColumn, MapColumnArguments } from '../map_column';
import { emptyTable, functionWrapper, testTable, tableWithNulls } from './utils';

const pricePlusTwo = jest.fn((datatable: Datatable) =>
  of(typeof datatable.rows[0].price === 'number' ? datatable.rows[0].price + 2 : null)
);

describe('mapColumn', () => {
  const fn = functionWrapper(mapColumn);
  const runFn = (input: Datatable, args: MapColumnArguments) =>
    fn(input, args) as Observable<Datatable>;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected));
  });

  it('returns a datatable with a new column with the values from mapping a function over each row in a datatable', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(testTable, {
          id: 'pricePlusTwo',
          name: 'pricePlusTwo',
          expression: pricePlusTwo,
        })
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: [
            ...testTable.columns,
            {
              id: 'pricePlusTwo',
              name: 'pricePlusTwo',
              meta: { type: 'number', params: { id: 'number' } },
            },
          ],
          rows: expect.arrayContaining([
            expect.objectContaining({
              pricePlusTwo: expect.anything(),
            }),
          ]),
        }),
      ]);
    });
  });

  it('allows the id arg to be optional, looking up by name instead', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(runFn(testTable, { name: 'name label', expression: pricePlusTwo })).toBe(
        '(0|)',
        [
          expect.objectContaining({
            type: 'datatable',
            columns: expect.arrayContaining([
              expect.objectContaining({
                id: 'name',
                name: 'name label',
                meta: expect.objectContaining({ type: 'number' }),
              }),
            ]),
            rows: expect.arrayContaining([
              expect.objectContaining({
                name: 202,
              }),
            ]),
          }),
        ]
      );
    });
  });

  it('allows a duplicate name when the ids are different', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(testTable, {
          id: 'new',
          name: 'name label',
          expression: pricePlusTwo,
        })
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: expect.arrayContaining([
            expect.objectContaining({
              id: 'new',
              name: 'name label',
              meta: expect.objectContaining({ type: 'number' }),
            }),
          ]),
          rows: expect.arrayContaining([
            expect.objectContaining({
              new: 202,
            }),
          ]),
        }),
      ]);
    });
  });

  it('overwrites existing column with the new column if an existing column name is provided', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(runFn(testTable, { name: 'name', expression: pricePlusTwo })).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: expect.arrayContaining([
            expect.objectContaining({
              name: 'name',
              meta: expect.objectContaining({ type: 'number' }),
            }),
          ]),
          rows: expect.arrayContaining([
            expect.objectContaining({
              name: 202,
            }),
          ]),
        }),
      ]);
    });
  });

  it('adds a column to empty tables', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(runFn(emptyTable, { name: 'name', expression: pricePlusTwo })).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: [
            expect.objectContaining({
              name: 'name',
              meta: expect.objectContaining({ type: 'null' }),
            }),
          ],
        }),
      ]);
    });
  });

  it('should assign specific id, different from name, when id arg is passed for copied column', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(testTable, { name: 'name', id: 'myid', expression: pricePlusTwo })
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: expect.arrayContaining([
            expect.objectContaining({
              id: 'myid',
              name: 'name',
              meta: expect.objectContaining({ type: 'number' }),
            }),
          ]),
        }),
      ]);
    });
  });

  it('should copy over the meta information from the specified column', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(
          {
            ...testTable,
            columns: [
              ...testTable.columns,
              // add a new entry
              {
                id: 'myId',
                name: 'myName',
                meta: { type: 'date', params: { id: 'number', params: { digits: 2 } } },
              },
            ],
            rows: testTable.rows.map((row) => ({ ...row, myId: Date.now() })),
          },
          { name: 'name', copyMetaFrom: 'myId', expression: pricePlusTwo }
        )
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: expect.arrayContaining([
            expect.objectContaining({
              id: 'name',
              name: 'name',
              meta: { type: 'date', params: { id: 'number', params: { digits: 2 } } },
            }),
          ]),
        }),
      ]);
    });
  });

  it('should be resilient if the references column for meta information does not exists', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(emptyTable, {
          name: 'name',
          copyMetaFrom: 'time',
          expression: pricePlusTwo,
        })
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: [
            expect.objectContaining({
              id: 'name',
              name: 'name',
              meta: expect.objectContaining({ type: 'null' }),
            }),
          ],
        }),
      ]);
    });
  });

  it('should correctly infer the type from the first row if the references column for meta information does not exists', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(
          { ...emptyTable, rows: [...emptyTable.rows, { price: 5 }] },
          { name: 'value', copyMetaFrom: 'time', expression: pricePlusTwo }
        )
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: [
            expect.objectContaining({
              id: 'value',
              name: 'value',
              meta: expect.objectContaining({ type: 'number' }),
            }),
          ],
          rows: [{ price: 5, value: 7 }],
        }),
      ]);
    });
  });

  it('should correctly infer the type from the first non-null row', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(
        runFn(tableWithNulls, {
          id: 'value',
          name: 'value',
          expression: pricePlusTwo,
        })
      ).toBe('(0|)', [
        expect.objectContaining({
          type: 'datatable',
          columns: [
            ...tableWithNulls.columns,
            expect.objectContaining({
              id: 'value',
              name: 'value',
              meta: expect.objectContaining({ type: 'number' }),
            }),
          ],
        }),
      ]);
    });
  });

  it('supports partial results', () => {
    testScheduler.run(({ expectObservable, cold }) => {
      pricePlusTwo.mockReturnValueOnce(cold('ab|', { a: 1000, b: 2000 }));

      expectObservable(
        runFn(testTable, {
          id: 'pricePlusTwo',
          name: 'pricePlusTwo',
          expression: pricePlusTwo,
        })
      ).toBe('01|', [
        expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              pricePlusTwo: 1000,
            }),
          ]),
        }),
        expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              pricePlusTwo: 2000,
            }),
          ]),
        }),
      ]);
    });
  });
});
