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

export interface CachedPanel {
  readonly type: string;
  readonly id?: string;
  readonly state: object;
}

export type PanelsCache = Map<string, CachedPanel[]>;

/** Returns the existing grid, section, or pinned panel that the incoming embeddable duplicates, if any. */
export const getDuplicate = async (
  embeddable: EmbeddablePackageState,
  initialState: Pick<DashboardState, 'panels' | 'pinned_panels'>,
  cache: PanelsCache
): Promise<CachedPanel | undefined> => {
  const { embeddableId, serializedState, type } = embeddable;
  if (embeddableId) {
    return undefined;
  }

  // A failed definition load or isDuplicate error means no duplicate, so the dashboard still opens.
  try {
    const embeddableDefinition = await embeddableService.getEmbeddableDefinition(type);
    if (!embeddableDefinition?.isDuplicate) {
      return undefined;
    }

    let panels = cache.get(type);
    if (!panels) {
      panels = [
        ...(initialState.pinned_panels ?? []),
        ...(initialState.panels ?? []).flatMap((widget) =>
          isDashboardSection(widget) ? widget.panels : [widget]
        ),
      ]
        .filter((panel) => panel.type === type)
        .map(({ type: panelType, id, config }) => ({ type: panelType, id, state: config }));
      cache.set(type, panels);
    }

    return panels.find(({ state }) => embeddableDefinition.isDuplicate?.(serializedState, state));
  } catch {
    return undefined;
  }
};
