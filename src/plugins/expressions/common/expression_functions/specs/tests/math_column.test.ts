/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mathColumn } from '../math_column';
import { functionWrapper, testTable, tableWithNulls } from './utils';

describe('mathColumn', () => {
  const fn = functionWrapper(mathColumn);

  it('throws if the id is used', async () => {
    await expect(
      fn(testTable, { id: 'price', name: 'price', expression: 'price * 2' })
    ).rejects.toHaveProperty('message', `ID must be unique`);
  });

  it('applies math to each row by id', async () => {
    const result = await fn(testTable, {
      id: 'output',
      name: 'output',
      expression: 'quantity * price',
    });
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

  it('extracts a single array value, but not a multi-value array', async () => {
    const arrayTable = {
      ...testTable,
      rows: [
        {
          name: 'product1',
          time: 1517842800950, // 05 Feb 2018 15:00:00 GMT
          price: [605, 500],
          quantity: [100],
          in_stock: true,
        },
      ],
    };
    const args = {
      id: 'output',
      name: 'output',
      expression: 'quantity',
    };
    expect((await fn(arrayTable, args)).rows[0].output).toEqual(100);
    await expect(fn(arrayTable, { ...args, expression: 'price' })).rejects.toHaveProperty(
      'message',
      `Cannot perform math on array values at output`
    );
  });

  it('handles onError', async () => {
    const args = {
      id: 'output',
      name: 'output',
      expression: 'quantity / 0',
    };
    await expect(fn(testTable, args)).rejects.toHaveProperty('message', `Cannot divide by 0`);
    await expect(fn(testTable, { ...args, onError: 'throw' })).rejects.toBeDefined();
    expect((await fn(testTable, { ...args, onError: 'zero' })).rows[0].output).toEqual(0);
    expect((await fn(testTable, { ...args, onError: 'false' })).rows[0].output).toEqual(false);
    expect((await fn(testTable, { ...args, onError: 'null' })).rows[0].output).toEqual(null);
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

  it('should correctly infer the type from the first non-null row', async () => {
    expect(
      await fn(tableWithNulls, {
        id: 'value',
        name: 'value',
        expression: 'price + 2',
        onError: 'null',
      })
    ).toEqual(
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
      })
    );
  });
});
