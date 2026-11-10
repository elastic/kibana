/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { areComparatorsEqual, type StateComparators } from '@kbn/presentation-publishing';
import { DEFAULT_DASHBOARD_OPTIONS } from '../constants';
import { approximationComparators, DEFAULT_APPROXIMATION_STATE } from './approximation';
import { getProjectRoutingComparators } from './project_routing';
import { DEFAULT_SETTINGS, optionsComparators } from './settings';
import { getUnifiedSearchComparators } from './unified_search';

/**
 * Default values applied by `areComparatorsEqual` when a value is missing.
 */
export const DASHBOARD_COMPARATOR_DEFAULTS: Partial<DashboardState> = {
  title: DEFAULT_SETTINGS.title,
  tags: DEFAULT_SETTINGS.tags,
  esql_approximation: DEFAULT_APPROXIMATION_STATE.esql_approximation,
};

/**
 * Comparators for every dashboard state key.
 * StateComparators requires an entry for every key, so adding a key to DashboardState
 * fails type checking until a comparator is added here.
 *
 * `panels` and `pinned_panels` are 'skip' here because they are NOT ignored.
 * Panel comparison is async (embeddable comparators are loaded on demand), but comparators
 * run synchronously, so `areEqual` compares panels and pinned panels separately.
 *
 * @param isTimeRestored Time range and refresh interval only count as changes when time is restored with the dashboard.
 * @param isProjectRoutingRestored Project routing only counts as a change when it is restored with the dashboard.
 */
export function getDashboardComparators({
  isTimeRestored,
  isProjectRoutingRestored,
}: {
  isTimeRestored: () => boolean;
  isProjectRoutingRestored: () => boolean;
}): StateComparators<DashboardState> {
  return {
    title: 'referenceEquality',
    description: 'referenceEquality',
    tags: 'deepEquality',
    options: (a, b) => areComparatorsEqual(optionsComparators, a, b, DEFAULT_DASHBOARD_OPTIONS),
    ...getUnifiedSearchComparators({ isTimeRestored }),
    ...getProjectRoutingComparators({ isRestored: isProjectRoutingRestored }),
    ...approximationComparators,
    access_control: 'deepEquality',
    // compared separately by areEqual, see above
    panels: 'skip',
    pinned_panels: 'skip',
  };
}
