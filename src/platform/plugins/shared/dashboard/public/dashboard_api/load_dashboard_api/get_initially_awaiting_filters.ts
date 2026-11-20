/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { embeddableService } from '../../services/kibana_services';

/**
 * Whether any pinned panel (only controls can be pinned) will be awaiting filters it is required to provide.
 * Resolved from the registered embeddable definitions, so that it is known before any panel is mounted.
 */
export const getInitiallyAwaitingFilters = async (
  pinnedPanels: DashboardState['pinned_panels']
): Promise<boolean> => {
  const awaiting = await Promise.all(
    (pinnedPanels ?? []).map(async ({ type, config }) => {
      try {
        const definition = await embeddableService.getEmbeddableDefinition(type);
        return Boolean(await definition?.isAwaitingFilters?.(config));
      } catch (e) {
        return false; // never block loading the dashboard on this
      }
    })
  );
  return awaiting.some(Boolean);
};
