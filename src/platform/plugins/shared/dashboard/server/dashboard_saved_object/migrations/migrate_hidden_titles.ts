/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { EmbeddableInput } from '@kbn/embeddable-plugin/common';
import type { SavedDashboardPanel } from '../schema';

import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from './utils';

/**
 * Before 7.10, hidden panel titles were stored as a blank string on the title attribute. In 7.10, this was replaced
 * with a usage of the existing hidePanelTitles key. Even though blank string titles still technically work
 * in versions > 7.10, they are less explicit than using the hidePanelTitles key. This migration transforms all
 * blank string titled panels to panels with the titles explicitly hidden.
 */
export const migrateExplicitlyHiddenTitles: SavedObjectMigrationFn<any, any> = (doc) => {
  const { attributes } = doc;

  // Skip if panelsJSON is missing
  if (typeof attributes?.panelsJSON !== 'string') return doc;

  try {
    const panels = JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[];
    // Same here, prevent failing saved object import if ever panels aren't an array.
    if (!Array.isArray(panels)) return doc;

    const newPanels: SavedDashboardPanel[] = [];
    panels.forEach((panel) => {
      // Convert each panel into the dashboard panel state
      const originalPanelState = convertSavedDashboardPanelToPanelState<EmbeddableInput>(panel);
      newPanels.push(
        convertPanelStateToSavedDashboardPanel({
          ...originalPanelState,
          explicitInput: {
            ...originalPanelState.explicitInput,
            ...(originalPanelState.explicitInput.title === '' &&
            !originalPanelState.explicitInput.hidePanelTitles
              ? { hidePanelTitles: true }
              : {}),
          },
        })
      );
    });
    return {
      ...doc,
      attributes: {
        ...attributes,
        panelsJSON: JSON.stringify(newPanels),
      },
    };
  } catch {
    return doc;
  }
};
