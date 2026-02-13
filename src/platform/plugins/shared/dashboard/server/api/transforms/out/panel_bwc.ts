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
