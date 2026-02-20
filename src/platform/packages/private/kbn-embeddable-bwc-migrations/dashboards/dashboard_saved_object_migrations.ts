/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectMigrationFn, SavedObjectMigrationMap } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { flow, mapValues } from 'lodash';
import { getAllEmbeddableMigrations } from '../get_all_embeddable_migrations';
import { mergeMigrationFunctionMaps, type MigrateFunctionsObject } from '../migration_utils';
import { migrateByValueDashboardPanels } from './migrations/migrate_by_value_dashboard_panels';
import { createExtractPanelReferencesMigration } from './migrations/migrate_extract_panel_references/migrate_extract_panel_references';
import { migrateExplicitlyHiddenTitles } from './migrations/migrate_hidden_titles';
import { replaceIndexPatternReference } from './migrations/migrate_index_pattern_reference';
import { migrateMatchAllQuery } from './migrations/migrate_match_all_query';
import { migrations700, migrations730 } from './migrations/migrate_to_730';
import { getAllEmbeddableReferenceManagers } from '../get_all_embeddable_reference_managers';

export const getDashboardSavedObjectMigrations = (
  embeddableSetup: EmbeddableSetup
): SavedObjectMigrationMap => {
  // gathers all of the hardcoded BWC embeddable migrations
  const bwcEmbeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationFn>(
    getAllEmbeddableMigrations(),
    migrateByValueDashboardPanels
  ) as MigrateFunctionsObject;

  // gathers all of the hardcoded BWC reference managers
  const bwcEmbeddableReferenceManagers = getAllEmbeddableReferenceManagers();

  // gathers all of the deprecated serverside embeddable factory migrations TODO, remove this when all serverside embeddable factories have been removed.
  const legacyEmbeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationFn>(
    embeddableSetup.getAllMigrations(),
    migrateByValueDashboardPanels
  ) as MigrateFunctionsObject;

  const embeddableMigrations = mergeMigrationFunctionMaps(
    bwcEmbeddableMigrations,
    legacyEmbeddableMigrations
  );

  const dashboardMigrations = {
    '6.7.2': flow(migrateMatchAllQuery),
    '7.0.0': flow(migrations700),
    '7.3.0': flow(migrations730),
    '7.9.3': flow(migrateMatchAllQuery),
    '7.11.0': flow(
      createExtractPanelReferencesMigration(bwcEmbeddableReferenceManagers, embeddableSetup)
    ),
    '7.14.0': flow(replaceIndexPatternReference),
    '7.17.3': flow(migrateExplicitlyHiddenTitles),
  };

  const test = mergeMigrationFunctionMaps(dashboardMigrations, embeddableMigrations);
  return test;
};
