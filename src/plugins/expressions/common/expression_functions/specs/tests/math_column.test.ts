/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mathColumn } from '../math_column';
import { functionWrapper, testTable } from './utils';

describe('mathColumn', () => {
  const fn = functionWrapper(mathColumn);

  it('throws if the id is used', () => {
    expect(() => fn(testTable, { id: 'price', name: 'price', expression: 'price * 2' })).toThrow(
      `ID must be unique`
    );
  });

  it('applies math to each row by id', () => {
    const result = fn(testTable, { id: 'output', name: 'output', expression: 'quantity * price' });
    expect(result.columns).toEqual([
      ...testTable.columns,
      { id: 'output', name: 'output', meta: { params: { id: 'number' }, type: 'number' } },
    ]);
    expect(result.rows[0]).toEqual({
      in_stock: true,
      name: 'product1',
      output: 60500,
      price: 605,
      quantity: 100,
      time: 1517842800950,
    });
  });

  it('handles onError', () => {
    const args = {
      id: 'output',
      name: 'output',
      expression: 'quantity / 0',
    };
    expect(() => fn(testTable, args)).toThrowError(`Cannot divide by 0`);
    expect(() => fn(testTable, { ...args, onError: 'throw' })).toThrow();
    expect(fn(testTable, { ...args, onError: 'zero' }).rows[0].output).toEqual(0);
    expect(fn(testTable, { ...args, onError: 'false' }).rows[0].output).toEqual(false);
    expect(fn(testTable, { ...args, onError: 'null' }).rows[0].output).toEqual(null);
  });

  it('should copy over the meta information from the specified column', async () => {
    const result = await fn(
      {
        ...testTable,
        columns: [
          ...testTable.columns,
          {
            id: 'myId',
            name: 'myName',
            meta: { type: 'date', params: { id: 'number', params: { digits: 2 } } },
          },
        ],
        rows: testTable.rows.map((row) => ({ ...row, myId: Date.now() })),
      },
      { id: 'output', name: 'name', copyMetaFrom: 'myId', expression: 'price + 2' }
    );

    expect(result.type).toBe('datatable');
    expect(result.columns[result.columns.length - 1]).toEqual({
      id: 'output',
      name: 'name',
      meta: { type: 'date', params: { id: 'number', params: { digits: 2 } } },
    });
  });
});
