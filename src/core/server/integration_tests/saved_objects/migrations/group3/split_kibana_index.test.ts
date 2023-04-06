/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import {
  readLog,
  startElasticsearch,
  getKibanaMigratorTestKit,
  getCurrentVersionTypeRegistry,
  overrideTypeRegistry,
  clearLog,
  getAggregatedTypesCount,
  currentVersion,
} from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';

// define a type => index distribution
const RELOCATE_TYPES: Record<string, string> = {
  dashboard: '.kibana_so_ui',
  visualization: '.kibana_so_ui',
  'canvas-workpad': '.kibana_so_ui',
  search: '.kibana_so_search',
};

describe('split .kibana index into multiple system indices', () => {
  let esServer: TestElasticsearchUtils['es'];
  let runMigrations: (rerun?: boolean | undefined) => Promise<MigrationResult[]>;
  let typeRegistry: ISavedObjectTypeRegistry;

  beforeAll(async () => {
    typeRegistry = await getCurrentVersionTypeRegistry({ oss: false });

    esServer = await startElasticsearch({
      dataArchive: Path.join(__dirname, '..', 'archives', '7.3.0_xpack_sample_saved_objects.zip'),
    });
  });

  beforeEach(async () => {
    await clearLog();
  });

  describe('when migrating from a legacy version', () => {
    it('performs v1 migration and then relocates saved objects into different indices, depending on their types', async () => {
      const updatedTypeRegistry = overrideTypeRegistry(
        typeRegistry,
        (type: SavedObjectsType<any>) => {
          return {
            ...type,
            indexPattern: RELOCATE_TYPES[type.name] ?? type.indexPattern,
          };
        }
      );

      const { client, runMigrations: runner } = await getKibanaMigratorTestKit({
        types: updatedTypeRegistry.getAllTypes(),
        kibanaIndex: '.kibana',
      });
      runMigrations = runner;

      // count of types in the legacy index
      expect(await getAggregatedTypesCount(client, '.kibana_1')).toEqual({
        'canvas-workpad': 3,
        config: 1,
        dashboard: 3,
        'index-pattern': 3,
        map: 3,
        'maps-telemetry': 1,
        'sample-data-telemetry': 3,
        search: 2,
        telemetry: 1,
        space: 1,
        visualization: 39,
      });

      await runMigrations();

      await client.indices.refresh({ index: ['.kibana', '.kibana_so_search', '.kibana_so_ui'] });

      expect(await getAggregatedTypesCount(client, '.kibana')).toEqual({
        'index-pattern': 3,
        map: 3,
        'sample-data-telemetry': 3,
        config: 1,
        telemetry: 1,
        space: 1,
      });
      expect(await getAggregatedTypesCount(client, '.kibana_so_search')).toEqual({
        search: 2,
      });
      expect(await getAggregatedTypesCount(client, '.kibana_so_ui')).toEqual({
        visualization: 39,
        'canvas-workpad': 3,
        dashboard: 3,
      });

      const indicesInfo = await client.indices.get({ index: '.kibana*' });
      expect(indicesInfo).toEqual(
        expect.objectContaining({
          '.kibana_8.8.0_001': {
            aliases: { '.kibana': expect.any(Object), '.kibana_8.8.0': expect.any(Object) },
            mappings: {
              dynamic: 'strict',
              _meta: {
                migrationMappingPropertyHashes: expect.any(Object),
                indexTypesMap: expect.any(Object),
              },
              properties: expect.any(Object),
            },
            settings: { index: expect.any(Object) },
          },
          '.kibana_so_search_8.8.0_001': {
            aliases: {
              '.kibana_so_search': expect.any(Object),
              '.kibana_so_search_8.8.0': expect.any(Object),
            },
            mappings: {
              dynamic: 'strict',
              _meta: {
                migrationMappingPropertyHashes: expect.any(Object),
                indexTypesMap: expect.any(Object),
              },
              properties: expect.any(Object),
            },
            settings: { index: expect.any(Object) },
          },
          '.kibana_so_ui_8.8.0_001': {
            aliases: {
              '.kibana_so_ui': expect.any(Object),
              '.kibana_so_ui_8.8.0': expect.any(Object),
            },
            mappings: {
              dynamic: 'strict',
              _meta: {
                migrationMappingPropertyHashes: expect.any(Object),
                indexTypesMap: expect.any(Object),
              },
              properties: expect.any(Object),
            },
            settings: { index: expect.any(Object) },
          },
        })
      );

      expect(indicesInfo[`.kibana_${currentVersion}_001`].mappings?._meta?.indexTypesMap)
        .toMatchInlineSnapshot(`
        Object {
          ".kibana": Array [
            "core-usage-stats",
            "legacy-url-alias",
            "config",
            "config-global",
            "usage-counters",
            "guided-onboarding-guide-state",
            "guided-onboarding-plugin-state",
            "ui-metric",
            "application_usage_totals",
            "application_usage_daily",
            "event_loop_delays_daily",
            "url",
            "index-pattern",
            "sample-data-telemetry",
            "space",
            "spaces-usage-stats",
            "exception-list-agnostic",
            "exception-list",
            "telemetry",
            "file",
            "fileShare",
            "action",
            "action_task_params",
            "connector_token",
            "query",
            "kql-telemetry",
            "search-session",
            "search-telemetry",
            "file-upload-usage-collection-telemetry",
            "alert",
            "api_key_pending_invalidation",
            "rules-settings",
            "tag",
            "graph-workspace",
            "canvas-element",
            "canvas-workpad-template",
            "lens",
            "lens-ui-telemetry",
            "map",
            "cases-comments",
            "cases-configure",
            "cases-connector-mappings",
            "cases",
            "cases-user-actions",
            "cases-telemetry",
            "slo",
            "ingest_manager_settings",
            "ingest-agent-policies",
            "ingest-outputs",
            "ingest-package-policies",
            "epm-packages",
            "epm-packages-assets",
            "fleet-preconfiguration-deletion-record",
            "ingest-download-sources",
            "fleet-fleet-server-host",
            "fleet-proxy",
            "fleet-message-signing-keys",
            "osquery-manager-usage-metric",
            "osquery-saved-query",
            "osquery-pack",
            "osquery-pack-asset",
            "csp-rule-template",
            "ml-job",
            "ml-trained-model",
            "ml-module",
            "uptime-dynamic-settings",
            "synthetics-privates-locations",
            "synthetics-monitor",
            "uptime-synthetics-api-key",
            "synthetics-param",
            "siem-ui-timeline-note",
            "siem-ui-timeline-pinned-event",
            "siem-detection-engine-rule-actions",
            "security-rule",
            "siem-ui-timeline",
            "endpoint:user-artifact",
            "endpoint:user-artifact-manifest",
            "security-solution-signals-migration",
            "infrastructure-ui-source",
            "metrics-explorer-view",
            "inventory-view",
            "infrastructure-monitoring-log-view",
            "upgrade-assistant-reindex-operation",
            "upgrade-assistant-ml-upgrade-operation",
            "monitoring-telemetry",
            "enterprise_search_telemetry",
            "app_search_telemetry",
            "workplace_search_telemetry",
            "apm-indices",
            "apm-telemetry",
            "apm-server-schema",
            "apm-service-group",
          ],
          ".kibana_so_search": Array [
            "search",
          ],
          ".kibana_so_ui": Array [
            "visualization",
            "canvas-workpad",
            "dashboard",
          ],
          ".kibana_task_manager": Array [
            "task",
          ],
        }
      `);

      const logs = await readLog();

      // .kibana_task_manager index exists and has no aliases => LEGACY_* migration path
      expect(logs).toMatch('[.kibana_task_manager] INIT -> LEGACY_SET_WRITE_BLOCK.');
      // .kibana_task_manager migrator is NOT involved in relocation, must not sync
      expect(logs).not.toMatch('[.kibana_task_manager] READY_TO_REINDEX_SYNC');

      // newer indices migrators did not exist, so they all have to reindex (create temp index + sync)
      ['.kibana_so_ui', '.kibana_so_search'].forEach((newIndex) => {
        expect(logs).toMatch(`[${newIndex}] INIT -> CREATE_REINDEX_TEMP.`);
        expect(logs).toMatch(`[${newIndex}] CREATE_REINDEX_TEMP -> READY_TO_REINDEX_SYNC.`);
        // no docs to reindex, as source index did NOT exist
        expect(logs).toMatch(`[${newIndex}] READY_TO_REINDEX_SYNC -> DONE_REINDEXING_SYNC.`);
      });

      // the .kibana migrator is involved in a relocation, it must also reindex
      expect(logs).toMatch('[.kibana] INIT -> WAIT_FOR_YELLOW_SOURCE.');
      expect(logs).toMatch('[.kibana] WAIT_FOR_YELLOW_SOURCE -> CHECK_UNKNOWN_DOCUMENTS.');
      expect(logs).toMatch('[.kibana] CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK.');
      expect(logs).toMatch('[.kibana] SET_SOURCE_WRITE_BLOCK -> CALCULATE_EXCLUDE_FILTERS.');
      expect(logs).toMatch('[.kibana] CALCULATE_EXCLUDE_FILTERS -> CREATE_REINDEX_TEMP.');
      expect(logs).toMatch('[.kibana] CREATE_REINDEX_TEMP -> READY_TO_REINDEX_SYNC.');
      expect(logs).toMatch('[.kibana] READY_TO_REINDEX_SYNC -> REINDEX_SOURCE_TO_TEMP_OPEN_PIT.');
      expect(logs).toMatch(
        '[.kibana] REINDEX_SOURCE_TO_TEMP_OPEN_PIT -> REINDEX_SOURCE_TO_TEMP_READ.'
      );
      expect(logs).toMatch('[.kibana] Starting to process 59 documents.');
      expect(logs).toMatch(
        '[.kibana] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_TRANSFORM.'
      );
      expect(logs).toMatch(
        '[.kibana] REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_INDEX_BULK.'
      );
      expect(logs).toMatch('[.kibana_task_manager] LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_DELETE.');
      expect(logs).toMatch(
        '[.kibana] REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> REINDEX_SOURCE_TO_TEMP_READ.'
      );
      expect(logs).toMatch('[.kibana] Processed 59 documents out of 59.');
      expect(logs).toMatch(
        '[.kibana] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT.'
      );
      expect(logs).toMatch('[.kibana] REINDEX_SOURCE_TO_TEMP_CLOSE_PIT -> DONE_REINDEXING_SYNC.');

      // after .kibana migrator is done relocating documents
      // the 3 migrators share the final part of the flow
      [
        ['.kibana', 8],
        ['.kibana_so_ui', 45],
        ['.kibana_so_search', 2],
      ].forEach(([index, docCount]) => {
        expect(logs).toMatch(`[${index}] DONE_REINDEXING_SYNC -> SET_TEMP_WRITE_BLOCK.`);
        expect(logs).toMatch(`[${index}] SET_TEMP_WRITE_BLOCK -> CLONE_TEMP_TO_TARGET.`);

        expect(logs).toMatch(`[${index}] CLONE_TEMP_TO_TARGET -> REFRESH_TARGET.`);
        expect(logs).toMatch(`[${index}] REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.`);
        expect(logs).toMatch(
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ.`
        );
        expect(logs).toMatch(`[${index}] Starting to process ${docCount} documents.`);
        expect(logs).toMatch(
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_TRANSFORM.`
        );
        expect(logs).toMatch(
          `[${index}] OUTDATED_DOCUMENTS_TRANSFORM -> TRANSFORMED_DOCUMENTS_BULK_INDEX.`
        );
        expect(logs).toMatch(
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.`
        );
        expect(logs).toMatch(
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> OUTDATED_DOCUMENTS_REFRESH.`
        );
        expect(logs).toMatch(`[${index}] OUTDATED_DOCUMENTS_REFRESH -> CHECK_TARGET_MAPPINGS.`);
        expect(logs).toMatch(
          `[${index}] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.`
        );

        expect(logs).toMatch(
          `[${index}] UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.`
        );
        expect(logs).toMatch(
          `[${index}] UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META.`
        );
        expect(logs).toMatch(
          `[${index}] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.`
        );
        expect(logs).toMatch(
          `[${index}] CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.`
        );

        expect(logs).toMatch(`[${index}] MARK_VERSION_INDEX_READY -> DONE.`);
        expect(logs).toMatch(`[${index}] Migration completed`);
      });
    });
  });

  afterEach(async () => {
    // we run the migrator again to ensure that the next time state is loaded everything still works as expected
    await clearLog();
    await runMigrations(true);

    const logs = await readLog();
    expect(logs).not.toMatch('REINDEX');
    expect(logs).not.toMatch('CREATE');
    expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS');
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });
});
