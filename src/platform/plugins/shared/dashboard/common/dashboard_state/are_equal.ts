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
import {
  areLayoutsEqual,
  arePanelConfigsEqual,
  arePinnedPanelConfigsEqual,
  assignMissingIds,
  deserializeLayout,
  getGeneratedIdPrefix,
  type GetComparators,
} from './layout';

/**
 * Checks whether two dashboard states are equal.
 *
 * @returns `true` when the two dashboard states are equal, `false` when they differ.
 */
export async function areEqual(
  a: DashboardState,
  b: DashboardState,
  getComparators: GetComparators
): Promise<boolean> {
  const comparators = getDashboardComparators(
    // Restored when either state restores it, so adding or removing time or project routing is a change.
    () => Boolean(a.time_range) || Boolean(b.time_range),
    () => Boolean(a.project_routing) || Boolean(b.project_routing)
  );
  if (!areComparatorsEqual(comparators, a, b, DASHBOARD_COMPARATOR_DEFAULTS)) return false;
  // Panels and sections without an id are matched by position.
  const prefix = getGeneratedIdPrefix(a, b);
  const deserialize = (state: DashboardState) =>
    deserializeLayout(
      assignMissingIds(state.panels, `${prefix}panel:`),
      assignMissingIds(state.pinned_panels, `${prefix}pinned:`)
    );
  const aLayout = deserialize(a);
  const bLayout = deserialize(b);
  if (!areLayoutsEqual(aLayout.layout, bLayout.layout)) return false;
  return (
    (await arePinnedPanelConfigsEqual(aLayout, bLayout, getComparators)) &&
    (await arePanelConfigsEqual(aLayout, bLayout, getComparators))
  );
}
