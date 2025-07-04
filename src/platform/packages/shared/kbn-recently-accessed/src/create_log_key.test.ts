/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogKey } from './create_log_key';

describe('createLogKey', () => {
  it('should create a key starting with "kibana.history"', async () => {
    expect(await createLogKey('foo', 'bar')).toMatch(/^kibana\.history/);
  });

  it('should include a hashed suffix of the identifier when present', async () => {
    const expectedSuffix = `/N4rLtula/QIYB+3If6bXDONEO5CnqBPrlURto+/j7k=`;
    expect(await createLogKey('foo', 'bar')).toMatch(`kibana.history.foo-${expectedSuffix}`);
  });

  it('should not include a hashed suffix if the identifier is not present', async () => {
    expect(await createLogKey('foo')).toEqual('kibana.history.foo');
  });
});
