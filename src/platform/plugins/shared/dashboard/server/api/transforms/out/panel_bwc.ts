/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import {
  ON_APPLY_FILTER,
  ON_CLICK_IMAGE,
  ON_CLICK_ROW,
  ON_CLICK_VALUE,
  ON_OPEN_PANEL_MENU,
  ON_SELECT_RANGE,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DrilldownState } from '@kbn/embeddable-plugin/server';
import type { SavedDashboardPanel } from '../../../dashboard_saved_object';

// Drilldowns used different Trigger Ids before 9.4.0
const TRIGGER_ID_MIGRATIONS: { [key: string]: string } = {
  VALUE_CLICK_TRIGGER: ON_CLICK_VALUE,
  IMAGE_CLICK_TRIGGER: ON_CLICK_IMAGE,
  ROW_CLICK_TRIGGER: ON_CLICK_ROW,
  SELECT_RANGE_TRIGGER: ON_SELECT_RANGE,
  FILTER_TRIGGER: ON_APPLY_FILTER,
  CONTEXT_MENU_TRIGGER: ON_OPEN_PANEL_MENU,
};

export function panelBwc(panel: SavedDashboardPanel, panelReferences: SavedObjectReference[]) {
  const { id, panelRefName, title, type, ...rest } = panel;

  function getPanelType() {
    if (type) {
      return type;
    }

    // Original by-reference implemenation stored embeddable type in reference
    const matchingReference =
      panelRefName && panelReferences
        ? panelReferences.find((reference) => reference.name === panelRefName)
        : undefined;

    return matchingReference ? matchingReference.type : 'unknown';
  }

  return {
    panel: {
      ...rest,
      embeddableConfig: {
        ...panel.embeddableConfig,
        // <8.19 title stored as siblings to embeddableConfig
        ...(title !== undefined && { title }),
        ...(Array.isArray(panel.embeddableConfig.drilldowns)
          ? {
              drilldowns: (panel.embeddableConfig.drilldowns as DrilldownState[]).map(
                ({ trigger, ...drilldown }) => ({
                  ...drilldown,
                  trigger: TRIGGER_ID_MIGRATIONS[trigger] ?? trigger,
                })
              ),
            }
          : {}),
      },
      type: getPanelType(),
    },
    panelReferences: transformPanelReferencesOut(panelReferences, panelRefName),
  };
}

// By reference types that stored panel references with the name 'savedObjectRef' before 9.4.0
const BY_REF_TYPES = ['links', 'search', 'visualization', 'lens', 'map'];

export function transformPanelReferencesOut(
  panelReferences: SavedObjectReference[],
  panelRefName?: string
) {
  return panelRefName
    ? panelReferences.map((ref) => {
        return ref.name === panelRefName && BY_REF_TYPES.includes(ref.type)
          ? {
              ...ref,
              // Embeddable transforms for BY_REF_TYPES embeddable types
              // are looking for by-reference reference with name 'savedObjectRef'
              name: 'savedObjectRef',
            }
          : ref;
      })
    : panelReferences;
}
