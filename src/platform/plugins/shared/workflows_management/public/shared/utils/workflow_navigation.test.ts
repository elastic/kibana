/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getWorkflowDetailRouteState,
  getWorkflowsListPathFromDetailRouteState,
} from './workflow_navigation';

describe('workflow navigation', () => {
  it('builds detail route state with the current workflows list search params', () => {
    expect(getWorkflowDetailRouteState('?tags=prod&enabled=true')).toEqual({
      workflowsListSearch: '?tags=prod&enabled=true',
    });
  });

  it('omits detail route state when the workflows list has no search params', () => {
    expect(getWorkflowDetailRouteState('')).toBeUndefined();
  });

  it('restores the workflows list path from detail route state', () => {
    expect(
      getWorkflowsListPathFromDetailRouteState({
        workflowsListSearch: '?tags=prod&enabled=true',
      })
    ).toBe('?tags=prod&enabled=true');
  });

  it('returns undefined when the detail route state has no workflows list search params', () => {
    expect(getWorkflowsListPathFromDetailRouteState(undefined)).toBeUndefined();
  });
});
