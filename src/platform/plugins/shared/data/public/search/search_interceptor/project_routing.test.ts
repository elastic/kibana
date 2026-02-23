/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICPSManager } from '@kbn/cps-utils';
import { getProjectRouting } from './project_routing';

const createMockCpsManager = (globalValue?: string) =>
  ({
    getProjectRouting: jest.fn(() => globalValue),
  } as unknown as ICPSManager);

describe('getProjectRouting', () => {
  it('returns undefined when cpsManager is not provided', () => {
    expect(getProjectRouting('_alias:_origin')).toBeUndefined();
    expect(getProjectRouting(undefined)).toBeUndefined();
  });

  it('returns the explicit override value when provided', () => {
    const cpsManager = createMockCpsManager('_alias:_origin');

    expect(getProjectRouting('_alias:*', cpsManager)).toBe('_alias:*');
    expect(getProjectRouting('_alias:_origin', cpsManager)).toBe('_alias:_origin');
    expect(cpsManager.getProjectRouting).not.toHaveBeenCalled();
  });

  it('falls back to cpsManager.getProjectRouting() when no override is provided', () => {
    const cpsManager = createMockCpsManager('_alias:_origin');

    expect(getProjectRouting(undefined, cpsManager)).toBe('_alias:_origin');
    expect(cpsManager.getProjectRouting).toHaveBeenCalled();
  });

  it('returns undefined when no override and cpsManager returns undefined', () => {
    const cpsManager = createMockCpsManager(undefined);

    expect(getProjectRouting(undefined, cpsManager)).toBeUndefined();
    expect(cpsManager.getProjectRouting).toHaveBeenCalled();
  });
});
