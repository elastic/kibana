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

    expect(callbacks.getColumnsFor.mock.calls.length).toBe(0);
  });

  test('loads fields with FROM source when commands after pipe present', async () => {
    const { validate, callbacks } = await setup();

    await validate('FROM kibana_ecommerce METADATA _id | eval');

    expect(callbacks.getColumnsFor.mock.calls.length).toBe(1);
  });
});
