/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type {
  EmbeddablePackageState,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import { isDashboardPanel } from '../../../common';

export interface CachedPanel {
  readonly type: string;
  readonly id?: string;
  readonly state: object;
}

export type PanelsCache = Map<string, CachedPanel[]>;

/** Returns the existing grid or pinned panel that the incoming embeddable duplicates, if any. */
export const getDuplicate = (
  { embeddableId, serializedState, type }: EmbeddablePackageState,
  embeddableDefinition: EmbeddablePublicDefinition | undefined,
  dashboardState: Pick<DashboardState, 'panels' | 'pinned_panels'>,
  cache: PanelsCache
): CachedPanel | undefined => {
  // An embeddableId already targets a panel, so it needs no duplicate check.
  const isDuplicate = embeddableDefinition?.isDuplicate;
  if (embeddableId || !isDuplicate) return undefined;

  // An isDuplicate error means no duplicate, so the dashboard still opens.
  try {
    let panels = cache.get(type);
    if (!panels) {
      // Incoming panels are placed at the top level, so panels scoped to a section are not valid duplicate targets.
      panels = [
        ...(dashboardState.pinned_panels ?? []),
        ...(dashboardState.panels ?? []).filter(isDashboardPanel),
      ]
        .filter((panel) => panel.type === type)
        .map(({ type: panelType, id, config }) => ({ type: panelType, id, state: config }));
      cache.set(type, panels);
    }

    return panels.find(({ state }) => isDuplicate(serializedState, state));
  } catch {
    return undefined;
  }
};
