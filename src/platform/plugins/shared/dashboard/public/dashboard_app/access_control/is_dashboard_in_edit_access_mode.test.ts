/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { isDashboardInEditAccessMode } from './is_dashboard_in_edit_access_mode';

describe('isDashboardInEditAccessMode', () => {
  it('should return true when accessControl is undefined', () => {
    const result = isDashboardInEditAccessMode(undefined);
    expect(result).toBe(true);
  });

  it('should return true when accessMode is undefined', () => {
    const accessControl: Partial<SavedObjectAccessControl> = {
      owner: 'user-id',
      accessMode: undefined,
    };
    const result = isDashboardInEditAccessMode(accessControl);
    expect(result).toBe(true);
  });

  it('should return true when accessMode is "default"', () => {
    const accessControl: SavedObjectAccessControl = {
      owner: 'user-id',
      accessMode: 'default',
    };
    const result = isDashboardInEditAccessMode(accessControl);
    expect(result).toBe(true);
  });

  it('should return false when accessMode is "read_only"', () => {
    const accessControl: SavedObjectAccessControl = {
      owner: 'user-id',
      accessMode: 'read_only',
    };
    const result = isDashboardInEditAccessMode(accessControl);
    expect(result).toBe(false);
  });

  it('should return true when only owner is specified without accessMode', () => {
    const accessControl: Partial<SavedObjectAccessControl> = {
      owner: 'user-id',
    };
    const result = isDashboardInEditAccessMode(accessControl);
    expect(result).toBe(true);
  });

  it('should handle partial accessControl objects correctly', () => {
    const accessControl: Partial<SavedObjectAccessControl> = {
      accessMode: 'default',
    };
    const result = isDashboardInEditAccessMode(accessControl);
    expect(result).toBe(true);
  });

  it('should return false for read_only mode even with partial object', () => {
    const accessControl: Partial<SavedObjectAccessControl> = {
      accessMode: 'read_only',
    };
    const result = isDashboardInEditAccessMode(accessControl);
    expect(result).toBe(false);
  });
});
