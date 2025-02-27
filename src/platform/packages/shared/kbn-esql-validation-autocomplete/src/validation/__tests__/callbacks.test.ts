/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('FROM', () => {
  test('does not load fields when validating only a single FROM, SHOW, ROW command', async () => {
    const { validate, callbacks } = await setup();

    await validate('FROM kib');
    await validate('FROM kibana_ecommerce METADATA _i');
    await validate('FROM kibana_ecommerce METADATA _id | ');
    await validate('SHOW');
    await validate('ROW \t');

    expect((callbacks.getColumnsFor as any).mock.calls.length).toBe(0);
  });

  test('loads fields with FROM source when commands after pipe present', async () => {
    const { validate, callbacks } = await setup();

    await validate('FROM kibana_ecommerce METADATA _id | eval');

    expect((callbacks.getColumnsFor as any).mock.calls.length).toBe(1);
  });

  test('loads fields from JOIN index', async () => {
    const { validate, callbacks } = await setup();

    await validate('FROM index1 | LOOKUP JOIN index2 ON field1 | LIMIT 123');

    expect((callbacks.getColumnsFor as any).mock.calls.length).toBe(1);

    const query = (callbacks.getColumnsFor as any).mock.calls[0][0].query as string;

    expect(query.includes('index1')).toBe(true);
    expect(query.includes('index2')).toBe(true);
  });

  test('includes all "from" and "join" index for loading fields', async () => {
    const { validate, callbacks } = await setup();

    await validate(
      'FROM index1, index2, index3 | LOOKUP JOIN index4 ON field1 | KEEP abc | LOOKUP JOIN index5 ON field2 | LIMIT 123'
    );

    expect((callbacks.getColumnsFor as any).mock.calls.length).toBe(1);

    const query = (callbacks.getColumnsFor as any).mock.calls[0][0].query as string;

    expect(query.includes('index1')).toBe(true);
    expect(query.includes('index2')).toBe(true);
    expect(query.includes('index3')).toBe(true);
    expect(query.includes('index4')).toBe(true);
    expect(query.includes('index5')).toBe(true);
    expect(query.includes('index6')).toBe(false);
  });
});
