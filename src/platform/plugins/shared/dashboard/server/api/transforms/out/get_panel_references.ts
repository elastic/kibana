/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { SavedDashboardPanel } from '../../../dashboard_saved_object';
import { getReferencesForPanelId } from '../../../../common';

function getDrilldownReferences(
  containerReferences: SavedObjectReference[],
  panel: SavedDashboardPanel
) {
  const config = panel.embeddableConfig as {
    enhancements?: {
      dynamicActions?: {
        events?: Array<{ eventId?: string }>;
      };
    };
  };
  const events = config.enhancements?.dynamicActions?.events;
  if (!Array.isArray(events) || events.length === 0) return [];

  const eventIds = events.map(({ eventId }) => eventId).filter((eventId) => eventId !== undefined);

  return containerReferences.filter(({ name }) =>
    eventIds.some((eventId) => name.includes(eventId))
  );
}

export function getPanelReferences(
  containerReferences: SavedObjectReference[],
  panel: SavedDashboardPanel
) {
  const panelRefs = getReferencesForPanelId(panel.panelIndex, containerReferences ?? []);
  if (panelRefs.length) return panelRefs;

  //
  // Panel references were not prefixed with panel id until 7.13
  //

  // It is possible to find drilldown reference since the reference structure is known
  const drillDownRefs = getDrilldownReferences(containerReferences, panel);

  // It is possible to find by-reference panel reference since the reference structure is known
  if (panel.panelRefName) {
    const panelRef = containerReferences.find(({ name }) => name === panel.panelRefName);
    return [...drillDownRefs, ...(panelRef ? [panelRef] : [])];
  }

  // 7.12 added by-value panels
  // It is not possible to find by value panel references since the reference structure is not known
  // Embeddables will have to find their own panel references in transformOut
  return drillDownRefs;
}
