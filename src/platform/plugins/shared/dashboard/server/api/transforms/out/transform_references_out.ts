/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DashboardState, DashboardPanel } from '../../types';
import { isDashboardSection } from '../../../../common';
import { embeddableService } from '../../../kibana_services';
import { getPanelIdFromReference } from '../../../../common/reference_utils';

export function transformReferencesOut(
  references: SavedObjectReference[],
  panels?: DashboardState['panels']
): SavedObjectReference[] {
  // key: panel uid
  // value: boolean indicating to drop references for panel
  // because transformOut injected references serverside
  // TODO - remove when all references are handled on server
  const dropRefsForPanel: Record<string, boolean> = {};
  function setDropRefsForPanel(panel: DashboardPanel) {
    if (!panel.uid) return;
    const { transformOutInjectsReferences } = embeddableService?.getTransforms(panel.type) ?? {};
    dropRefsForPanel[panel.uid] = Boolean(transformOutInjectsReferences);
  }
  (panels ?? []).forEach((panel) => {
    if (isDashboardSection(panel)) {
      panel.panels.forEach((panelInSection) => setDropRefsForPanel(panelInSection));
    } else {
      setDropRefsForPanel(panel);
    }
  });

  return references
    .map((ref) => {
      return isLegacySavedObjectRef(ref) ? transformLegacySavedObjectRef(ref) : ref;
    })
    .filter((ref) => {
      const panelId = getPanelIdFromReference(ref);
      return panelId && dropRefsForPanel[panelId]
        ? // drop references for panels that inject references on server
          false
        : true;
    });
}

// < 9.2 legach saved object ref name shape `${panelId}:panel_${panelId}`
const LEGACY_SAVED_OBJECT_REF_NAME_PREFIX = 'panel_';

function isLegacySavedObjectRef(ref: SavedObjectReference) {
  return ref.name.includes(LEGACY_SAVED_OBJECT_REF_NAME_PREFIX);
}

function transformLegacySavedObjectRef(ref: SavedObjectReference) {
  const split = ref.name.split(LEGACY_SAVED_OBJECT_REF_NAME_PREFIX);
  const panelId = split.length >= 2 ? split[1] : undefined;
  return {
    ...ref,
    name: panelId ? `${panelId}:savedObjectRef` : 'savedObjectRef',
  };
}
