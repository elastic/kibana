/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, mapValues } from 'lodash';

import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { mergeSavedObjectMigrationMaps } from '@kbn/core-saved-objects-utils-server';

import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/server';
import { SavedObjectMigration, SavedObjectMigrationMap } from '@kbn/core-saved-objects-server';

import { migrations730, migrations700 } from './migrate_to_730';
import { migrateMatchAllQuery } from './migrate_match_all_query';
import { migrateExplicitlyHiddenTitles } from './migrate_hidden_titles';
import { replaceIndexPatternReference } from './migrate_index_pattern_reference';
import { migrateByValueDashboardPanels } from './migrate_by_value_dashboard_panels';
import { createExtractPanelReferencesMigration } from './migrate_extract_panel_references';

export interface DashboardSavedObjectTypeMigrationsDeps {
  embeddable: EmbeddableSetup;
  core: CoreSetup<{ embeddable: EmbeddableStart }>;
}

export const createDashboardSavedObjectTypeMigrations = (
  deps: DashboardSavedObjectTypeMigrationsDeps
): SavedObjectMigrationMap => {
  const embeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigration>(
    deps.embeddable.getAllMigrations(),
    migrateByValueDashboardPanels
  );

  const dashboardMigrations = {
    '6.7.2': flow(migrateMatchAllQuery),
    '7.0.0': flow(migrations700),
    '7.3.0': flow(migrations730),
    '7.9.3': flow(migrateMatchAllQuery),
    '7.11.0': flow(createExtractPanelReferencesMigration(deps)),
    '7.14.0': flow(replaceIndexPatternReference),
    '7.17.3': flow(migrateExplicitlyHiddenTitles),
  };

  return mergeSavedObjectMigrationMaps(dashboardMigrations, embeddableMigrations);
};
