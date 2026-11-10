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

export type ProjectRoutingState = Pick<DashboardState, 'project_routing'>;

/**
 * @param isRestored Project routing only counts as a change when it is restored with the dashboard.
 */
export function getProjectRoutingComparators({
  isRestored,
}: {
  isRestored: () => boolean;
}): StateComparators<ProjectRoutingState> {
  return {
    project_routing: (a, b) => !isRestored() || a === b,
  };
}
