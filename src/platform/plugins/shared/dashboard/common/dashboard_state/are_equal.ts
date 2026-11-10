/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { areComparatorsEqual } from '@kbn/presentation-publishing';
import { DASHBOARD_COMPARATOR_DEFAULTS, getDashboardComparators } from './comparators';
import { areEqual as areLayoutsEqual, type GetComparators } from './layout/are_equal';

/**
 * Checks whether two dashboard states are equal.
 *
 * `panels` and `pinned_panels` are compared with the comparators returned by `getComparators`.
 * All other keys are compared with the comparators from `getDashboardComparators`.
 */
export async function areEqual(
  a: DashboardState,
  b: DashboardState,
  getComparators: GetComparators
): Promise<boolean> {
  const comparators = getDashboardComparators({
    // Restored when either state restores it, so adding or removing time or project routing is a change.
    isTimeRestored: () => Boolean(a.time_range) || Boolean(b.time_range),
    isProjectRoutingRestored: () => Boolean(a.project_routing) || Boolean(b.project_routing),
  });
  if (!areComparatorsEqual(comparators, a, b, DASHBOARD_COMPARATOR_DEFAULTS)) return false;
  return areLayoutsEqual(a, b, getComparators);
}
