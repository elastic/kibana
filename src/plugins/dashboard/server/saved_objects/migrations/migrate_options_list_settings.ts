/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';

import {
  ControlPanelState,
  OPTIONS_LIST_CONTROL,
  type ControlsPanels,
} from '@kbn/controls-plugin/common';
import { SavedObjectMigrationFn } from '@kbn/core/server';

/**
 * Need to migrate both the "Allow include/exclude" and "Allow exists query" toggles to be undefined
 * because the UX has been removed
 */
export const migrateOptionsListSettings: SavedObjectMigrationFn<any, any> = (doc) => {
  const { attributes } = doc;

  if (
    !attributes?.controlGroupInput ||
    !attributes?.controlGroupInput?.panelsJSON ||
    typeof attributes?.controlGroupInput?.panelsJSON !== 'string'
  ) {
    return doc;
  }

  try {
    const panels = JSON.parse(attributes.controlGroupInput.panelsJSON) as ControlsPanels;
    const newPanels = Object.keys(panels).reduce<ControlsPanels>((panelAccumulator, panelId) => {
      const oldPanel: ControlPanelState = panels[panelId];
      if (oldPanel.type === OPTIONS_LIST_CONTROL) {
        const newExplicitInput = {
          id: oldPanel.explicitInput.id,
          ...omit(oldPanel.explicitInput, ['hideExclude', 'hideExists']),
        };
        const newPanel: ControlPanelState = { ...panels[panelId], explicitInput: newExplicitInput };
        return {
          ...panelAccumulator,
          [panelId]: newPanel,
        };
      }
      return {
        ...panelAccumulator,
        [panelId]: oldPanel,
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
