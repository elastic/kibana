/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRICS_GRID_SORT_DEFAULTS } from '@kbn/discover-utils';
import { DEFAULT_METRICS_SORT } from './constants';

describe('DEFAULT_METRICS_SORT', () => {
  it('stays in sync with METRICS_GRID_SORT_DEFAULTS from @kbn/discover-utils', () => {
    expect([METRICS_GRID_SORT_DEFAULTS.field, METRICS_GRID_SORT_DEFAULTS.direction]).toEqual([
      ...DEFAULT_METRICS_SORT,
    ]);
  });
});
