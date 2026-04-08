/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorByValueType } from '../../../schema/color';

/**
 * Lens-known default color for Gauge charts.
 *
 * Gauge applies a 4-step "status" palette by default (percentage-based).
 * The hex values are stable across light and dark themes.
 */
export const GAUGE_DEFAULT_COLOR: ColorByValueType = {
  type: 'dynamic',
  range: 'percentage',
  steps: [
    { gte: 0, lt: 25, color: '#24c292' },
    { gte: 25, lt: 50, color: '#aee8d2' },
    { gte: 50, lt: 75, color: '#ffc9c2' },
    { gte: 75, lte: 100, color: '#f6726a' },
  ],
};
