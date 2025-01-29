/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import { getDefaultUserProfileImplementation } from './default_implementation';

describe('getDefaultUserProfileImplementation', () => {
  let implementation: CoreUserProfileDelegateContract;

  beforeEach(() => {
    implementation = getDefaultUserProfileImplementation();
  });

  it('getCurrent resolves to null', async () => {
    expect(await implementation.getCurrent({ dataPath: '/data-path' })).toBeNull();
  });
  it('bulkGet resolves to empty list', async () => {
    expect(await implementation.bulkGet({ uids: new Set() })).toEqual([]);
  });
  it('suggest resolves to empty list', async () => {
    expect(await implementation.suggest('/suggest', { name: 'foo' })).toEqual([]);
  });
  it('update resolves to undefined', async () => {
    expect(await implementation.update({})).toBeUndefined();
  });
  it('partialUpdate resolves to undefined', async () => {
    expect(await implementation.update({})).toBeUndefined();
  });
});
