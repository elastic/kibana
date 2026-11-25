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
import { asyncForEach } from '@kbn/std';

import { getPlacementHints } from '../../panel_placement/get_placement_hints';
import { getDuplicate, type PanelsCache } from './get_duplicate';

/**
 * Prepares incoming embeddables to be added to a dashboard.
 * - Reuses the ID of a matching panel in `currentState` so the embeddable updates that panel instead of duplicating it.
 * - Fills in a default size from the embeddable's placement hints when none is provided.
 *
 * @returns copies of the incoming embeddables with the prepared state.
 */
export async function prepareIncomingEmbeddables(
  incomingEmbeddables: EmbeddablePackageState[] | undefined,
  currentState: Pick<DashboardState, 'panels' | 'pinned_panels'>
): Promise<EmbeddablePackageState[]> {
  const panelsCache: PanelsCache = new Map();
  const prepared: EmbeddablePackageState[] = [];
  await asyncForEach(incomingEmbeddables ?? [], async (embeddable) => {
    const next = { ...embeddable };
    const duplicate = await getDuplicate(next, currentState, panelsCache);
    if (duplicate?.id) {
      next.embeddableId = duplicate.id;
    }

    if (!next.size) {
      next.size = await getPlacementHints(next.type, next.serializedState);
    }
    prepared.push(next);
  });
  return prepared;
}
