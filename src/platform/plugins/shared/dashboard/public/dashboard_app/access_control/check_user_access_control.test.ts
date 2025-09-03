/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core/server';
import { checkUserAccessControl } from './check_user_access_control';

describe('checkUserAccessControl', () => {
  it('should return false when userId is undefined', () => {
    const result = checkUserAccessControl({
      accessControl: { owner: 'owner-id', accessMode: 'default' },
      createdBy: 'creator-id',
      userId: undefined,
    });

    expect(result).toBe(false);
  });

  it('should return true when userId matches createdBy and there is no accessControl', () => {
    const result = checkUserAccessControl({
      accessControl: undefined,
      createdBy: 'user-123',
      userId: 'user-123',
    });

    expect(result).toBe(true);
  });

  it('should return false when userId does not match createdBy and there is no accessControl', () => {
    const result = checkUserAccessControl({
      accessControl: undefined,
      createdBy: 'creator-id',
      userId: 'different-user-id',
    });

    expect(result).toBe(false);
  });

  it('should return true when userId matches the owner', () => {
    const accessControl: SavedObjectAccessControl = {
      owner: 'owner-123',
      accessMode: 'default',
    };

    const result = checkUserAccessControl({
      accessControl,
      createdBy: 'different-creator',
      userId: 'owner-123',
    });

    expect(result).toBe(true);
  });

  it('should return false when userId does not match the owner', () => {
    const accessControl: SavedObjectAccessControl = {
      owner: 'owner-123',
      accessMode: 'default',
    };

    const result = checkUserAccessControl({
      accessControl,
      createdBy: 'creator-id',
      userId: 'different-user',
    });

    expect(result).toBe(false);
  });

  it('should prioritize owner over createdBy when both are present', () => {
    const accessControl: SavedObjectAccessControl = {
      owner: 'owner-123',
      accessMode: 'default',
    };

    // User matches createdBy but not owner - should return false
    const result1 = checkUserAccessControl({
      accessControl,
      createdBy: 'user-456',
      userId: 'user-456',
    });

    expect(result1).toBe(false);

    // User matches owner but not createdBy - should return true
    const result2 = checkUserAccessControl({
      accessControl,
      createdBy: 'different-creator',
      userId: 'owner-123',
    });

    expect(result2).toBe(true);
  });
});
