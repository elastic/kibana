/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../../expression_types';
import { mapColumn, MapColumnArguments } from '../map_column';
import { emptyTable, functionWrapper, testTable } from './utils';

const pricePlusTwo = (datatable: Datatable) => Promise.resolve(datatable.rows[0].price + 2);

describe('mapColumn', () => {
  const fn = functionWrapper(mapColumn);
  const runFn = (input: Datatable, args: MapColumnArguments) =>
    fn(input, args) as Promise<Datatable>;

  it('returns a datatable with a new column with the values from mapping a function over each row in a datatable', () => {
    return runFn(testTable, {
      id: 'pricePlusTwo',
      name: 'pricePlusTwo',
      expression: pricePlusTwo,
    }).then((result) => {
      const arbitraryRowIndex = 2;

      expect(result.type).toBe('datatable');
      expect(result.columns).toEqual([
        ...testTable.columns,
        { id: 'pricePlusTwo', name: 'pricePlusTwo', meta: { type: 'number' } },
      ]);
      expect(result.columns[result.columns.length - 1]).toHaveProperty('name', 'pricePlusTwo');
      expect(result.rows[arbitraryRowIndex]).toHaveProperty('pricePlusTwo');
    });
  });

  it('overwrites existing column with the new column if an existing column name is provided', () => {
    return runFn(testTable, { name: 'name', expression: pricePlusTwo }).then((result) => {
      const nameColumnIndex = result.columns.findIndex(({ name }) => name === 'name');
      const arbitraryRowIndex = 4;

      expect(result.type).toBe('datatable');
      expect(result.columns).toHaveLength(testTable.columns.length);
      expect(result.columns[nameColumnIndex]).toHaveProperty('name', 'name');
      expect(result.columns[nameColumnIndex].meta).toHaveProperty('type', 'number');
      expect(result.rows[arbitraryRowIndex]).toHaveProperty('name', 202);
    });
  });

  it('adds a column to empty tables', () => {
    return runFn(emptyTable, { name: 'name', expression: pricePlusTwo }).then((result) => {
      expect(result.type).toBe('datatable');
      expect(result.columns).toHaveLength(1);
      expect(result.columns[0]).toHaveProperty('name', 'name');
      expect(result.columns[0].meta).toHaveProperty('type', 'null');
    });
  });

  it('should assign specific id, different from name, when id arg is passed for new columns', () => {
    return runFn(emptyTable, { name: 'name', id: 'myid', expression: pricePlusTwo }).then(
      (result) => {
        expect(result.type).toBe('datatable');
        expect(result.columns).toHaveLength(1);
        expect(result.columns[0]).toHaveProperty('name', 'name');
        expect(result.columns[0]).toHaveProperty('id', 'myid');
        expect(result.columns[0].meta).toHaveProperty('type', 'null');
      }
    );
  });

  it('should assign specific id, different from name, when id arg is passed for copied column', () => {
    return runFn(testTable, { name: 'name', id: 'myid', expression: pricePlusTwo }).then(
      (result) => {
        const nameColumnIndex = result.columns.findIndex(({ name }) => name === 'name');
        expect(result.type).toBe('datatable');
        expect(result.columns[nameColumnIndex]).toEqual({
          id: 'myid',
          name: 'name',
          meta: { type: 'string' },
        });
      }
    );
  });

  it('should copy over the meta information from the specified column', () => {
    return runFn(testTable, { name: 'name', copyMetaFrom: 'time', expression: pricePlusTwo }).then(
      (result) => {
        const nameColumnIndex = result.columns.findIndex(({ name }) => name === 'name');
        expect(result.type).toBe('datatable');
        expect(result.columns[nameColumnIndex]).toEqual({
          id: 'name',
          name: 'name',
          meta: { type: 'date' },
        });
      }
    );
  });

  it('should be resilient if the references column for meta information does not exists', () => {
    return runFn(emptyTable, { name: 'name', copyMetaFrom: 'time', expression: pricePlusTwo }).then(
      (result) => {
        expect(result.type).toBe('datatable');
        expect(result.columns).toHaveLength(1);
        expect(result.columns[0]).toHaveProperty('name', 'name');
        expect(result.columns[0]).toHaveProperty('id', 'name');
        expect(result.columns[0].meta).toHaveProperty('type', 'null');
      }
    );
  });

  describe('expression', () => {
    it('maps null values to the new column', () => {
      return runFn(testTable, { name: 'empty' }).then((result) => {
        const emptyColumnIndex = result.columns.findIndex(({ name }) => name === 'empty');
        const arbitraryRowIndex = 8;

        expect(result.columns[emptyColumnIndex]).toHaveProperty('name', 'empty');
        expect(result.columns[emptyColumnIndex].meta).toHaveProperty('type', 'null');
        expect(result.rows[arbitraryRowIndex]).toHaveProperty('empty', null);
      });
    });
  });
});
