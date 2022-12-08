/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ControlPanelState,
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
  type ControlsPanels,
} from '@kbn/controls-plugin/common';
import { SavedObjectMigrationFn } from '@kbn/core/server';

import { DashboardAttributes } from '../../../common';

export const migrateControlGroup: SavedObjectMigrationFn<DashboardAttributes> = (doc) => {
  const { attributes } = doc;
  if (
    !attributes?.controlGroupInput ||
    typeof attributes?.controlGroupInput?.panelsJSON !== 'string'
  ) {
    return doc;
  }

  try {
    const panels = JSON.parse(attributes.controlGroupInput.panelsJSON) as ControlsPanels;
    const newPanels = Object.keys(panels).reduce<ControlsPanels>((panelAccumulator, panelId) => {
      const panel: ControlPanelState = panels[panelId];
      if (MigrateControlPanel[panel.type]) {
        MigrateControlPanel[panel.type].migratePanel(panel);
      }
      return {
        ...panelAccumulator,
        [panelId]: panel,
      };
    }, {});

    return {
      ...doc,
      attributes: {
        ...attributes,
        controlGroupInput: {
          ...attributes.controlGroupInput,
          panelsJSON: JSON.stringify(newPanels),
        },
      },
    };
  } catch {
    return doc;
  }
};

const MigrateControlPanel: {
  [type: string]: { migratePanel: (panel: ControlPanelState) => void };
} = {
  [OPTIONS_LIST_CONTROL]: {
    /**
     * Need to migrate both the "Allow include/exclude" and "Allow exists query" toggles to be undefined
     * because these were introduced in 8.6.0 but the UX was removed in 8.7.0.
     *
     * This function changes the panel by reference.
     */
    migratePanel: (panel) => {
      const explicitInput = panel.explicitInput as OptionsListEmbeddableInput;
      delete explicitInput.hideExclude;
      delete explicitInput.hideExists;
    },
  },
};
