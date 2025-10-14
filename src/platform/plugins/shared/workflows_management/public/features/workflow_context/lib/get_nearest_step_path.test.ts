/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNearestStepPath } from './get_nearest_step_path';

describe('getNearestStepPath', () => {
  it('should return the nearest step name', () => {
    const path = ['workflow', 'steps', 0, 'if'];
    expect(getNearestStepPath(path)).toEqual(['workflow', 'steps', 0]);
  });
  it('should return null if there is no steps', () => {
    const path = ['workflow', 'consts', 'test'];
    expect(getNearestStepPath(path)).toEqual(null);
  });
  it('should return the nearest step path if multiple steps are present', () => {
    const path = ['workflow', 'steps', 0, 'steps', 2, 'foreach'];
    expect(getNearestStepPath(path)).toEqual(['workflow', 'steps', 0, 'steps', 2]);
  });
  it('should handle step inside else branch', () => {
    const path = ['workflow', 'steps', 0, 'steps', 2, 'else', 'steps', 0];
    expect(getNearestStepPath(path)).toEqual([
      'workflow',
      'steps',
      0,
      'steps',
      2,
      'else',
      'steps',
      0,
    ]);
  });
  it('should return step path for nested with parameters', () => {
    const path = ['workflow', 'steps', 0, 'steps', 2, 'steps', 0, 'with', 'message'];
    expect(getNearestStepPath(path)).toEqual(['workflow', 'steps', 0, 'steps', 2, 'steps', 0]);
  });
});
