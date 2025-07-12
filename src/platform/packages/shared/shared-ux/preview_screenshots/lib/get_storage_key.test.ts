/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStorageKey } from './get_storage_key';

describe('getStorageKey', () => {
  it('should return the correct storage key for a given saved object ID', () => {
    const savedObjectId = 'test-id';
    const expectedKey = 'kibana:preview:test-id';
    const actualKey = getStorageKey(savedObjectId);
    expect(actualKey).toBe(expectedKey);
  });

  it('should handle empty string IDs', () => {
    const savedObjectId = '';
    const expectedKey = 'kibana:preview:';
    const actualKey = getStorageKey(savedObjectId);
    expect(actualKey).toBe(expectedKey);
  });
});
