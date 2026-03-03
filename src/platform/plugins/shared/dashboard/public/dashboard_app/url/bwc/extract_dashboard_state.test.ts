/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { DEFAULT_DASHBOARD_STATE } from '../../../dashboard_api/default_dashboard_state';
import { extractDashboardState } from './extract_dashboard_state';

describe('extractDashboardState', () => {
  test('should extract all DashboardState fields', () => {
    const optionalState = {
      time_range: {
        from: 'now-15m',
        to: 'now',
      },
      references: [],
      refresh_interval: {
        pause: false,
        value: 5,
      },
    };
    expect(
      extractDashboardState({
        ...DEFAULT_DASHBOARD_STATE,
        ...optionalState,
      })
    ).toEqual({
      ...omit(DEFAULT_DASHBOARD_STATE, 'panels'),
      ...optionalState,
    });
  });
});
