/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { asyncMap } from '@kbn/std';

import { getPlacementHints } from '../../panel_placement/get_placement_hints';
import { embeddableService } from '../../services/kibana_services';
import { getDuplicate, type PanelsCache } from './get_duplicate';

/**
 * Prepares incoming embeddables to be added to a dashboard.
 * - Fills in a default size from the embeddable's placement hints when none is provided.
 * - Reuses the ID of a matching panel so the embeddable updates that panel instead of duplicating it.
 *
 * All async work completes before `getState` is called,
 * so duplicates are matched against the state at the time the result is returned.
 */
export async function prepareIncomingEmbeddables(
  incomingEmbeddables: EmbeddablePackageState[] = [],
  getState: () => Pick<DashboardState, 'panels' | 'pinned_panels'>
): Promise<EmbeddablePackageState[]> {
  // async
  const embeddables = await asyncMap(incomingEmbeddables, ensureSize);
  const definitions = await asyncMap(embeddables, ({ type }) =>
    embeddableService
      .getEmbeddableDefinition(type)
      // A definition that fails to load is treated as missing so the dashboard still opens.
      .catch(() => undefined)
  );

  // sync
  const state = getState();
  const panelsCache: PanelsCache = new Map();
  return embeddables.map((embeddable, i) => {
    const duplicate = getDuplicate(embeddable, definitions[i], state, panelsCache);
    return duplicate?.id ? { ...embeddable, embeddableId: duplicate.id } : embeddable;
  });
}

async function ensureSize(embeddable: EmbeddablePackageState): Promise<EmbeddablePackageState> {
  return embeddable.size
    ? embeddable
    : { ...embeddable, size: await getPlacementHints(embeddable.type, embeddable.serializedState) };
}
