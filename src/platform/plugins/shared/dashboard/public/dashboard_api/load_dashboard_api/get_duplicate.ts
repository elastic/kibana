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
import { isDashboardSection } from '../../../common';
import { embeddableService } from '../../services/kibana_services';

export type PanelsCache = Map<string, Array<{ type: string; id?: string; state: object }>>;

/**
 * Returns the existing panel (grid or pinned) that the embeddable duplicates, if any.
 * Panels are gathered per type into `cache`.
 */
export async function getDuplicate(
  embeddable: EmbeddablePackageState,
  initialState: Pick<DashboardState, 'panels' | 'pinned_panels'>,
  cache: PanelsCache
) {
  if (embeddable.embeddableId) return;

  const embeddableDefinition = await embeddableService.getEmbeddableDefinition(embeddable.type);
  if (!embeddableDefinition?.isDuplicate) return;

  let panels = cache.get(embeddable.type);
  if (!panels) {
    panels = [
      ...(initialState.pinned_panels ?? []),
      ...(initialState.panels ?? []).flatMap((widget) =>
        isDashboardSection(widget) ? widget.panels : [widget]
      ),
    ]
      .filter(({ type }) => type === embeddable.type)
      .map(({ type, id, config }) => ({ type, id, state: config }));
    cache.set(embeddable.type, panels);
  }

  return panels.find(({ state }) =>
    embeddableDefinition.isDuplicate?.(embeddable.serializedState, state)
  );
}
