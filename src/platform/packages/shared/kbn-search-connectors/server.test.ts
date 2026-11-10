/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fetchConnectors, SyncStatus } from './server';

jest.mock('@elastic/eui', () => {
  throw new Error('The search connectors server entry loaded browser UI code');
});

describe('server entry', () => {
  it('loads connector utilities without loading EUI', () => {
    expect(fetchConnectors).toEqual(expect.any(Function));
    expect(SyncStatus.COMPLETED).toBe('completed');
  });
});
