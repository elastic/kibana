/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow, mapValues } from 'lodash';

import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
} from '@kbn/kibana-utils-plugin/common';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { SavedObjectMigrationFn, SavedObjectMigrationMap } from '@kbn/core/server';

import { migrations730, migrations700 } from './migrate_to_730';
import { migrateMatchAllQuery } from './migrate_match_all_query';
import { migrateExplicitlyHiddenTitles } from './migrate_hidden_titles';
import { replaceIndexPatternReference } from './migrate_index_pattern_reference';
import { migrateByValueDashboardPanels } from './migrate_by_value_dashboard_panels';
import { createExtractPanelReferencesMigration } from './migrate_extract_panel_references';

export interface DashboardSavedObjectTypeMigrationsDeps {
  embeddable: EmbeddableSetup;
}

export const createDashboardSavedObjectTypeMigrations = (
  deps: DashboardSavedObjectTypeMigrationsDeps
): SavedObjectMigrationMap => {
  const embeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationFn>(
    deps.embeddable.getAllMigrations(),
    migrateByValueDashboardPanels
  ) as MigrateFunctionsObject;

  const dashboardMigrations = {
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
