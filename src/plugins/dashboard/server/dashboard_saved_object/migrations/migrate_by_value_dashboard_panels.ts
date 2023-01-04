/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CONTROL_GROUP_TYPE,
  rawControlGroupAttributesToSerializable,
  serializableToRawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { Serializable } from '@kbn/utility-types';
import { SavedObjectMigrationFn } from '@kbn/core/server';
import { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import { SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/common';

import {
  convertPanelStateToSavedDashboardPanel,
  convertSavedDashboardPanelToPanelState,
  SavedDashboardPanel,
} from '../../../common';

type ValueOrReferenceInput = SavedObjectEmbeddableInput & {
  attributes?: Serializable;
  savedVis?: Serializable;
};

// Runs the embeddable migrations on each panel
export const migrateByValueDashboardPanels =
  (migrate: MigrateFunction, version: string): SavedObjectMigrationFn =>
  (doc: any) => {
    const { attributes } = doc;

    if (attributes?.controlGroupInput) {
      const controlGroupInput = rawControlGroupAttributesToSerializable(
        attributes.controlGroupInput
      );
      const migratedControlGroupInput = migrate({
        ...controlGroupInput,
        type: CONTROL_GROUP_TYPE,
      });
      attributes.controlGroupInput =
        serializableToRawControlGroupAttributes(migratedControlGroupInput);
    }

    // Skip if panelsJSON is missing otherwise this will cause saved object import to fail when
    // importing objects without panelsJSON. At development time of this, there is no guarantee each saved
    // object has panelsJSON in all previous versions of kibana.
    if (typeof attributes?.panelsJSON !== 'string') {
      return doc;
    }

    const panels = JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[];
    // Same here, prevent failing saved object import if ever panels aren't an array.
    if (!Array.isArray(panels)) {
      return doc;
    }
    const newPanels: SavedDashboardPanel[] = [];
    panels.forEach((panel) => {
      // Convert each panel into a state that can be passed to EmbeddablesSetup.migrate
      const originalPanelState =
        convertSavedDashboardPanelToPanelState<ValueOrReferenceInput>(panel);

      // saved vis is used to store by value input for Visualize. This should eventually be renamed to `attributes` to align with Lens and Maps
      if (
        originalPanelState.explicitInput.attributes ||
        originalPanelState.explicitInput.savedVis
      ) {
        // If this panel is by value, migrate the state using embeddable migrations
        const migratedInput = migrate({
          ...originalPanelState.explicitInput,
          type: originalPanelState.type,
        });
        // Convert the embeddable state back into the panel shape
        newPanels.push(
          convertPanelStateToSavedDashboardPanel(
            {
              ...originalPanelState,
              explicitInput: { ...migratedInput, id: migratedInput.id as string },
            },
            version
          )
        );
      } else {
        newPanels.push(panel);
      }
    });
    return {
      ...doc,
      attributes: {
        ...attributes,
        panelsJSON: JSON.stringify(newPanels),
      },
    };
  };
