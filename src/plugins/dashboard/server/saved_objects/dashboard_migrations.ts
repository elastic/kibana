/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Serializable } from '@kbn/utility-types';
import { get, flow, mapValues } from 'lodash';
import {
  SavedObjectAttributes,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
} from 'kibana/server';

import { migrations730 } from './migrations_730';
import { SavedDashboardPanel } from '../../common/types';
import { EmbeddableSetup } from '../../../embeddable/server';
import { migrateMatchAllQuery } from './migrate_match_all_query';
import {
  serializableToRawAttributes,
  DashboardDoc700To720,
  DashboardDoc730ToLatest,
  rawAttributesToSerializable,
} from '../../common';
import { injectReferences, extractReferences } from '../../common/saved_dashboard_references';
import {
  convertPanelStateToSavedDashboardPanel,
  convertSavedDashboardPanelToPanelState,
} from '../../common/embeddable/embeddable_saved_object_converters';
import { SavedObjectEmbeddableInput } from '../../../embeddable/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../../data/common';
import {
  mergeMigrationFunctionMaps,
  MigrateFunction,
  MigrateFunctionsObject,
} from '../../../kibana_utils/common';
import { replaceIndexPatternReference } from './replace_index_pattern_reference';
import { CONTROL_GROUP_TYPE } from '../../../controls/common';

function migrateIndexPattern(doc: DashboardDoc700To720) {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  if (typeof searchSourceJSON !== 'string') {
    return;
  }
  let searchSource;
  try {
    searchSource = JSON.parse(searchSourceJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return;
  }
  if (searchSource.index) {
    searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    doc.references.push({
      name: searchSource.indexRefName,
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      id: searchSource.index,
    });
    delete searchSource.index;
  }
  if (searchSource.filter) {
    searchSource.filter.forEach((filterRow: any, i: number) => {
      if (!filterRow.meta || !filterRow.meta.index) {
        return;
      }
      filterRow.meta.indexRefName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
      doc.references.push({
        name: filterRow.meta.indexRefName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: filterRow.meta.index,
      });
      delete filterRow.meta.index;
    });
  }
  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);
}

const migrations700: SavedObjectMigrationFn<any, any> = (doc): DashboardDoc700To720 => {
  // Set new "references" attribute
  doc.references = doc.references || [];

  // Migrate index pattern
  migrateIndexPattern(doc as DashboardDoc700To720);
  // Migrate panels
  const panelsJSON = get(doc, 'attributes.panelsJSON');
  if (typeof panelsJSON !== 'string') {
    return doc as DashboardDoc700To720;
  }
  let panels;
  try {
    panels = JSON.parse(panelsJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return doc as DashboardDoc700To720;
  }
  if (!Array.isArray(panels)) {
    return doc as DashboardDoc700To720;
  }
  panels.forEach((panel, i) => {
    if (!panel.type || !panel.id) {
      return;
    }
    panel.panelRefName = `panel_${i}`;
    doc.references!.push({
      name: `panel_${i}`,
      type: panel.type,
      id: panel.id,
    });
    delete panel.type;
    delete panel.id;
  });
  doc.attributes.panelsJSON = JSON.stringify(panels);
  return doc as DashboardDoc700To720;
};

/**
 * In 7.8.0 we introduced dashboard drilldowns which are stored inside dashboard saved object as part of embeddable state
 * In 7.11.0 we created an embeddable references/migrations system that allows to properly extract embeddable persistable state
 * https://github.com/elastic/kibana/issues/71409
 * The idea of this migration is to inject all the embeddable panel references and then run the extraction again.
 * As the result of the extraction:
 * 1. In addition to regular `panel_` we will get new references which are extracted by `embeddablePersistableStateService` (dashboard drilldown references)
 * 2. `panel_` references will be regenerated
 * All other references like index-patterns are forwarded non touched
 * @param deps
 */
function createExtractPanelReferencesMigration(
  deps: DashboardSavedObjectTypeMigrationsDeps
): SavedObjectMigrationFn<DashboardDoc730ToLatest['attributes']> {
  return (doc) => {
    const references = doc.references ?? [];

    /**
     * Remembering this because dashboard's extractReferences won't return those
     * All other references like `panel_` will be overwritten
     */
    const oldNonPanelReferences = references.filter((ref) => !ref.name.startsWith('panel_'));

    const injectedAttributes = injectReferences(
      {
        attributes: doc.attributes as unknown as SavedObjectAttributes,
        references,
      },
      { embeddablePersistableStateService: deps.embeddable }
    );

    const { attributes, references: newPanelReferences } = extractReferences(
      { attributes: injectedAttributes, references: [] },
      { embeddablePersistableStateService: deps.embeddable }
    );

    return {
      ...doc,
      references: [...oldNonPanelReferences, ...newPanelReferences],
      attributes,
    };
  };
}

type ValueOrReferenceInput = SavedObjectEmbeddableInput & {
  attributes?: Serializable;
  savedVis?: Serializable;
};

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
      const originalPanelState =
        convertSavedDashboardPanelToPanelState<ValueOrReferenceInput>(panel);
      newPanels.push(
        convertPanelStateToSavedDashboardPanel(
          {
            ...originalPanelState,
            explicitInput: {
              ...originalPanelState.explicitInput,
              ...(originalPanelState.explicitInput.title === '' &&
              !originalPanelState.explicitInput.hidePanelTitles
                ? { hidePanelTitles: true }
                : {}),
            },
          },
          panel.version
        )
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

// Runs the embeddable migrations on each panel
const migrateByValuePanels =
  (migrate: MigrateFunction, version: string): SavedObjectMigrationFn =>
  (doc: any) => {
    const { attributes } = doc;

    if (attributes?.controlGroupInput) {
      const controlGroupInput = rawAttributesToSerializable(attributes.controlGroupInput);
      const migratedControlGroupInput = migrate({
        ...controlGroupInput,
        type: CONTROL_GROUP_TYPE,
      });
      attributes.controlGroupInput = serializableToRawAttributes(migratedControlGroupInput);
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

export interface DashboardSavedObjectTypeMigrationsDeps {
  embeddable: EmbeddableSetup;
}

export const createDashboardSavedObjectTypeMigrations = (
  deps: DashboardSavedObjectTypeMigrationsDeps
): SavedObjectMigrationMap => {
  const embeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationFn>(
    deps.embeddable.getAllMigrations(),
    migrateByValuePanels
  ) as MigrateFunctionsObject;

  const dashboardMigrations = {
    /**
     * We need to have this migration twice, once with a version prior to 7.0.0 once with a version
     * after it. The reason for that is, that this migration has been introduced once 7.0.0 was already
     * released. Thus a user who already had 7.0.0 installed already got the 7.0.0 migrations below running,
     * so we need a version higher than that. But this fix was backported to the 6.7 release, meaning if we
     * would only have the 7.0.1 migration in here a user on the 6.7 release will migrate their saved objects
     * to the 7.0.1 state, and thus when updating their Kibana to 7.0, will never run the 7.0.0 migrations introduced
     * in that version. So we apply this twice, once with 6.7.2 and once with 7.0.1 while the backport to 6.7
     * only contained the 6.7.2 migration and not the 7.0.1 migration.
     */
    '6.7.2': flow(migrateMatchAllQuery),
    '7.0.0': flow(migrations700),
    '7.3.0': flow(migrations730),
    '7.9.3': flow(migrateMatchAllQuery),
    '7.11.0': flow(createExtractPanelReferencesMigration(deps)),
    '7.14.0': flow(replaceIndexPatternReference),
    '7.17.3': flow(migrateExplicitlyHiddenTitles),
  };

  return mergeMigrationFunctionMaps(dashboardMigrations, embeddableMigrations);
};
