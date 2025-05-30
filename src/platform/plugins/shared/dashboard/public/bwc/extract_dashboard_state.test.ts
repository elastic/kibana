/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DASHBOARD_STATE } from '../dashboard_api/default_dashboard_state';
import { extractDashboardState } from './extract_dashboard_state';

describe('extractDashboardState', () => {
  test('should extract all DashboardState fields', () => {
    const optionalState = {
      timeRange: {
        from: 'now-15m',
        to: 'now'
      },
      references: [],
      refreshInterval: {
        pause: false,
        value: 5
      },
    }
    expect(extractDashboardState({
      ...DEFAULT_DASHBOARD_STATE,
      ...optionalState,
      // panels stored as array in URL
      panels: [{
        gridData: {},
        panelConfig: {},
        panelIndex: '9a545750-c833-496e-999f-59aff71c17e7',
        type: 'testEmbeddable'
      }],
    })).toEqual({
      ...DEFAULT_DASHBOARD_STATE,
      ...optionalState,
      panels: {
        ['9a545750-c833-496e-999f-59aff71c17e7']: {
          gridData: {},
          explicitInput: {},
          panelRefName: undefined,
          type: 'testEmbeddable',
          version: undefined
        }
      }
    });
  });
})