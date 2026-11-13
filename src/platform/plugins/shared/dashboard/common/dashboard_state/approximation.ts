/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

export type ApproximationState = Pick<DashboardState, 'esql_approximation'>;

export const DEFAULT_APPROXIMATION_STATE: ApproximationState = {
  esql_approximation: false,
};

export const approximationComparators: StateComparators<ApproximationState> = {
  esql_approximation: (a, b) => Boolean(a) === Boolean(b),
};
