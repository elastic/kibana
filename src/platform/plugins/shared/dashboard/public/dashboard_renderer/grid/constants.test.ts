/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DASHBOARD_GRID_MARGIN_SIZE,
  DASHBOARD_GRID_ROW_HEIGHT,
} from '@kbn/as-code-dashboard-schema';
import { DASHBOARD_GRID_HEIGHT, DASHBOARD_MARGIN_SIZE } from './constants';

describe('dashboard grid constants', () => {
  it('match the copies the agent layout uses to turn pixels into grid rows', () => {
    expect(DASHBOARD_GRID_HEIGHT).toBe(DASHBOARD_GRID_ROW_HEIGHT);
    expect(DASHBOARD_MARGIN_SIZE).toBe(DASHBOARD_GRID_MARGIN_SIZE);
  });
});
