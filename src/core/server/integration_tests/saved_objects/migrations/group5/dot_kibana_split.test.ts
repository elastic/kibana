/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  type ISavedObjectTypeRegistry,
  type SavedObjectsType,
  MAIN_SAVED_OBJECT_INDEX,
  ALL_SAVED_OBJECT_INDICES,
} from '@kbn/core-saved-objects-server';
import { DEFAULT_INDEX_TYPES_MAP } from '@kbn/core-saved-objects-base-server-internal';
import {
  clearLog,
  startElasticsearch,
  getKibanaMigratorTestKit,
  getCurrentVersionTypeRegistry,
  overrideTypeRegistry,
  getAggregatedTypesCount,
  currentVersion,
  type KibanaMigratorTestKit,
  getEsClient,
  getAggregatedTypesCountAllIndices,
} from '../kibana_migrator_test_kit';
import { delay, parseLogFile } from '../test_utils';
import '../jest_matchers';

// define a type => index distribution
const RELOCATE_TYPES: Record<string, string> = {
  dashboard: '.kibana_so_ui',
  visualization: '.kibana_so_ui',
  'canvas-workpad': '.kibana_so_ui',
  search: '.kibana_so_search',
  task: '.kibana_task_manager',
  // the remaining types will be forced to go to '.kibana',
  // overriding `indexPattern: foo` defined in the registry
};

const PARALLEL_MIGRATORS = 6;
export const logFilePathFirstRun = Path.join(__dirname, 'dot_kibana_split_1st_run.test.log');
export const logFilePathSecondRun = Path.join(__dirname, 'dot_kibana_split_2nd_run.test.log');

describe('split .kibana index into multiple system indices', () => {
  let esServer: TestElasticsearchUtils['es'];
  let typeRegistry: ISavedObjectTypeRegistry;

  beforeAll(async () => {
    typeRegistry = await getCurrentVersionTypeRegistry({ oss: false });
  });

  beforeEach(async () => {
    await clearLog(logFilePathFirstRun);
    await clearLog(logFilePathSecondRun);
  });

  describe('when migrating from a legacy version', () => {
    let migratorTestKitFactory: (logFilePath: string) => Promise<KibanaMigratorTestKit>;

    beforeAll(async () => {
      esServer = await startElasticsearch({
        dataArchive: Path.join(__dirname, '..', 'archives', '7.3.0_xpack_sample_saved_objects.zip'),
        timeout: 60000,
      });
    });

    it('performs v1 migration and then relocates saved objects into different indices, depending on their types', async () => {
      const updatedTypeRegistry = overrideTypeRegistry(
        typeRegistry,
        (type: SavedObjectsType<any>) => {
          return {
            ...type,
            indexPattern: RELOCATE_TYPES[type.name] ?? MAIN_SAVED_OBJECT_INDEX,
          };
        }
      );

      migratorTestKitFactory = (logFilePath: string) =>
        getKibanaMigratorTestKit({
          types: updatedTypeRegistry.getAllTypes(),
          kibanaIndex: '.kibana',
          logFilePath,
          defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
        });

      const { runMigrations, client } = await migratorTestKitFactory(logFilePathFirstRun);

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

      await client.indices.refresh({
        index: ['.kibana', '.kibana_so_search', '.kibana_so_ui'],
      });

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
      expect(indicesInfo[`.kibana_${currentVersion}_001`]).toEqual(
        expect.objectContaining({
          aliases: expect.objectContaining({ '.kibana': expect.any(Object) }),
          mappings: {
            dynamic: 'strict',
            _meta: {
              mappingVersions: expect.any(Object),
              indexTypesMap: expect.any(Object),
            },
            properties: expect.any(Object),
          },
          settings: { index: expect.any(Object) },
        })
      );

      expect(indicesInfo[`.kibana_so_search_${currentVersion}_001`]).toEqual(
        expect.objectContaining({
          aliases: expect.objectContaining({ '.kibana_so_search': expect.any(Object) }),
          mappings: {
            dynamic: 'strict',
            _meta: {
              mappingVersions: expect.any(Object),
              indexTypesMap: expect.any(Object),
            },
            properties: expect.any(Object),
          },
          settings: { index: expect.any(Object) },
        })
      );

      expect(indicesInfo[`.kibana_so_ui_${currentVersion}_001`]).toEqual(
        expect.objectContaining({
          aliases: expect.objectContaining({ '.kibana_so_ui': expect.any(Object) }),
          mappings: {
            dynamic: 'strict',
            _meta: {
              mappingVersions: expect.any(Object),
              indexTypesMap: expect.any(Object),
            },
            properties: expect.any(Object),
          },
          settings: { index: expect.any(Object) },
        })
      );

      expect(indicesInfo[`.kibana_${currentVersion}_001`].mappings?._meta?.indexTypesMap)
        .toMatchInlineSnapshot(`
        Object {
          ".kibana": Array [
            "action",
            "action_task_params",
            "ad_hoc_run_params",
            "alert",
            "api_key_pending_invalidation",
            "apm-custom-dashboards",
            "apm-indices",
            "apm-server-schema",
            "apm-service-group",
            "apm-telemetry",
            "app_search_telemetry",
            "application_usage_daily",
            "application_usage_totals",
            "canvas-element",
            "canvas-workpad-template",
            "cases",
            "cases-comments",
            "cases-configure",
            "cases-connector-mappings",
            "cases-rules",
            "cases-telemetry",
            "cases-user-actions",
            "cloud-security-posture-settings",
            "config",
            "config-global",
            "connector_token",
            "core-usage-stats",
            "csp-rule-template",
            "endpoint:unified-user-artifact-manifest",
            "endpoint:user-artifact-manifest",
            "enterprise_search_telemetry",
            "entity-definition",
            "entity-discovery-api-key",
            "epm-packages",
            "epm-packages-assets",
            "event-annotation-group",
            "event_loop_delays_daily",
            "exception-list",
            "exception-list-agnostic",
            "file",
            "file-upload-usage-collection-telemetry",
            "fileShare",
            "fleet-fleet-server-host",
            "fleet-message-signing-keys",
            "fleet-preconfiguration-deletion-record",
            "fleet-proxy",
            "fleet-setup-lock",
            "fleet-uninstall-tokens",
            "graph-workspace",
            "guided-onboarding-guide-state",
            "guided-onboarding-plugin-state",
            "index-pattern",
            "infra-custom-dashboards",
            "infrastructure-monitoring-log-view",
            "infrastructure-ui-source",
            "ingest-agent-policies",
            "ingest-download-sources",
            "ingest-outputs",
            "ingest-package-policies",
            "ingest_manager_settings",
            "inventory-view",
            "kql-telemetry",
            "legacy-url-alias",
            "lens",
            "lens-ui-telemetry",
            "links",
            "maintenance-window",
            "map",
            "metrics-data-source",
            "metrics-explorer-view",
            "ml-job",
            "ml-module",
            "ml-trained-model",
            "monitoring-telemetry",
            "observability-onboarding-state",
            "osquery-manager-usage-metric",
            "osquery-pack",
            "osquery-pack-asset",
            "osquery-saved-query",
            "policy-settings-protection-updates-note",
            "query",
            "risk-engine-configuration",
            "rules-settings",
            "sample-data-telemetry",
            "search-session",
            "search-telemetry",
            "security-rule",
            "security-solution-signals-migration",
            "siem-detection-engine-rule-actions",
            "siem-ui-timeline",
            "siem-ui-timeline-note",
            "siem-ui-timeline-pinned-event",
            "slo",
            "slo-settings",
            "space",
            "spaces-usage-stats",
            "synthetics-dynamic-settings",
            "synthetics-monitor",
            "synthetics-param",
            "synthetics-privates-locations",
            "tag",
            "telemetry",
            "threshold-explorer-view",
            "ui-metric",
            "upgrade-assistant-ml-upgrade-operation",
            "upgrade-assistant-reindex-operation",
            "uptime-dynamic-settings",
            "uptime-synthetics-api-key",
            "url",
            "usage-counters",
            "workplace_search_telemetry",
          ],
          ".kibana_so_search": Array [
            "search",
          ],
          ".kibana_so_ui": Array [
            "canvas-workpad",
            "dashboard",
            "visualization",
          ],
          ".kibana_task_manager": Array [
            "task",
          ],
        }
      `);

      const logs = await parseLogFile(logFilePathFirstRun);

      expect(logs).toContainLogEntries(
        [
          // .kibana_task_manager index exists and has no aliases => LEGACY_* migration path
          '[.kibana_task_manager] INIT -> LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION.',
          '[.kibana_task_manager] LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION -> LEGACY_SET_WRITE_BLOCK.',
          '[.kibana_task_manager] LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_DELETE.',
          '[.kibana_task_manager] LEGACY_DELETE -> SET_SOURCE_WRITE_BLOCK.',
          '[.kibana_task_manager] SET_SOURCE_WRITE_BLOCK -> CALCULATE_EXCLUDE_FILTERS.',
          '[.kibana_task_manager] CALCULATE_EXCLUDE_FILTERS -> CREATE_REINDEX_TEMP.',
          '[.kibana_task_manager] CREATE_REINDEX_TEMP -> REINDEX_SOURCE_TO_TEMP_OPEN_PIT.',
          '[.kibana_task_manager] REINDEX_SOURCE_TO_TEMP_OPEN_PIT -> REINDEX_SOURCE_TO_TEMP_READ.',
          '[.kibana_task_manager] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_TRANSFORM.',
          '[.kibana_task_manager] REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_INDEX_BULK.',
          '[.kibana_task_manager] REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> REINDEX_SOURCE_TO_TEMP_READ.',
          '[.kibana_task_manager] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT.',
          '[.kibana_task_manager] REINDEX_SOURCE_TO_TEMP_CLOSE_PIT -> SET_TEMP_WRITE_BLOCK.',
          '[.kibana_task_manager] SET_TEMP_WRITE_BLOCK -> CLONE_TEMP_TO_TARGET.',
          '[.kibana_task_manager] CLONE_TEMP_TO_TARGET -> REFRESH_TARGET.',
          '[.kibana_task_manager] REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
          '[.kibana_task_manager] OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ.',
          '[.kibana_task_manager] OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.',
          '[.kibana_task_manager] OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> CHECK_TARGET_MAPPINGS.',
          '[.kibana_task_manager] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.',
          '[.kibana_task_manager] UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.',
          '[.kibana_task_manager] UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META.',
          '[.kibana_task_manager] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.',
          '[.kibana_task_manager] CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.',
          '[.kibana_task_manager] MARK_VERSION_INDEX_READY -> DONE.',
          '[.kibana_task_manager] Migration completed after',
        ],
        { ordered: true }
      );

      expect(logs).not.toContainLogEntries([
        // .kibana_task_manager migrator is NOT involved in relocation, must not sync with other migrators
        '[.kibana_task_manager] READY_TO_REINDEX_SYNC',
        '[.kibana_task_manager] DONE_REINDEXING_SYNC',
        // .kibana_task_manager migrator performed a REINDEX migration, it must update ALL types
        '[.kibana_task_manager] Kibana is performing a compatible update and it will update the following SO types so that ES can pickup the updated mappings',
      ]);

      // new indices migrators did not exist, so they all have to reindex (create temp index + sync)
      ['.kibana_so_ui', '.kibana_so_search'].forEach((newIndex) => {
        expect(logs).toContainLogEntries(
          [
            `[${newIndex}] INIT -> CREATE_REINDEX_TEMP.`,
            `[${newIndex}] CREATE_REINDEX_TEMP -> READY_TO_REINDEX_SYNC.`,
            // no docs to reindex, as source index did NOT exist
            `[${newIndex}] READY_TO_REINDEX_SYNC -> DONE_REINDEXING_SYNC.`,
          ],
          { ordered: true }
        );
      });

      // the .kibana migrator is involved in a relocation, it must also reindex
      expect(logs).toContainLogEntries(
        [
          '[.kibana] INIT -> WAIT_FOR_YELLOW_SOURCE.',
          '[.kibana] WAIT_FOR_YELLOW_SOURCE -> CHECK_CLUSTER_ROUTING_ALLOCATION.',
          '[.kibana] CHECK_CLUSTER_ROUTING_ALLOCATION -> CHECK_UNKNOWN_DOCUMENTS.',
          '[.kibana] CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK.',
          '[.kibana] SET_SOURCE_WRITE_BLOCK -> CALCULATE_EXCLUDE_FILTERS.',
          '[.kibana] CALCULATE_EXCLUDE_FILTERS -> CREATE_REINDEX_TEMP.',
          '[.kibana] CREATE_REINDEX_TEMP -> READY_TO_REINDEX_SYNC.',
          '[.kibana] READY_TO_REINDEX_SYNC -> REINDEX_SOURCE_TO_TEMP_OPEN_PIT.',
          '[.kibana] REINDEX_SOURCE_TO_TEMP_OPEN_PIT -> REINDEX_SOURCE_TO_TEMP_READ.',
          '[.kibana] Starting to process 59 documents.',
          '[.kibana] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_TRANSFORM.',
          '[.kibana] REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_INDEX_BULK.',
          '[.kibana] REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> REINDEX_SOURCE_TO_TEMP_READ.',
          '[.kibana] Processed 59 documents out of 59.',
          '[.kibana] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT.',
          '[.kibana] REINDEX_SOURCE_TO_TEMP_CLOSE_PIT -> DONE_REINDEXING_SYNC.',
        ],
        { ordered: true }
      );

      // after .kibana migrator is done relocating documents
      // the 3 migrators share the final part of the flow
      ['.kibana', '.kibana_so_ui', '.kibana_so_search'].forEach((index) => {
        expect(logs).toContainLogEntries(
          [
            `[${index}] DONE_REINDEXING_SYNC -> SET_TEMP_WRITE_BLOCK.`,
            `[${index}] SET_TEMP_WRITE_BLOCK -> CLONE_TEMP_TO_TARGET.`,
            `[${index}] CLONE_TEMP_TO_TARGET -> REFRESH_TARGET.`,
            `[${index}] REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.`,
            `[${index}] OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ.`,
            `[${index}] OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.`,
            `[${index}] OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> CHECK_TARGET_MAPPINGS.`,
            `[${index}] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.`,
            `[${index}] UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.`,
            `[${index}] UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META.`,
            `[${index}] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.`,
            `[${index}] CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY_SYNC.`,
            `[${index}] MARK_VERSION_INDEX_READY_SYNC`, // all migrators try to update all aliases, all but one will have conclicts
            `[${index}] Migration completed after`,
          ],
          { ordered: true }
        );
      });

      // should NOT retransform anything (we reindexed, thus we transformed already)
      ['.kibana', '.kibana_task_manager', '.kibana_so_ui', '.kibana_so_search'].forEach((index) => {
        expect(logs).not.toContainLogEntry(`[${index}] OUTDATED_DOCUMENTS_TRANSFORM`);
        expect(logs).not.toContainLogEntry(
          `[${index}] Kibana is performing a compatible update and it will update the following SO types so that ES can pickup the updated mappings`
        );
      });
    });

    afterEach(async () => {
      // we run the migrator again to ensure that the next time state is loaded everything still works as expected
      const { runMigrations } = await migratorTestKitFactory(logFilePathSecondRun);
      await runMigrations();
      const logs = await parseLogFile(logFilePathSecondRun);
      expect(logs).not.toContainLogEntries(['REINDEX', 'CREATE', 'UPDATE_TARGET_MAPPINGS']);
    });

    afterAll(async () => {
      await esServer?.stop();
      await delay(2);
    });
  });

  describe('when multiple Kibana migrators run in parallel', () => {
    jest.setTimeout(1200000);
    it('correctly migrates 7.7.2_xpack_100k_obj.zip archive', async () => {
      esServer = await startElasticsearch({
        dataArchive: Path.join(__dirname, '..', 'archives', '7.7.2_xpack_100k_obj.zip'),
      });
      const esClient = await getEsClient();

      const breakdownBefore = await getAggregatedTypesCountAllIndices(esClient);
      expect(breakdownBefore).toEqual({
        '.kibana': {
          'apm-telemetry': 1,
          application_usage_transactional: 4,
          config: 1,
          dashboard: 52994,
          'index-pattern': 1,
          'maps-telemetry': 1,
          search: 1,
          space: 1,
          'ui-metric': 5,
          visualization: 53004,
        },
        '.kibana_task_manager': {
          task: 5,
        },
      });

      for (let i = 0; i < PARALLEL_MIGRATORS; ++i) {
        await clearLog(Path.join(__dirname, `dot_kibana_split_instance_${i}.log`));
      }

      const testKits = await Promise.all(
        new Array(PARALLEL_MIGRATORS).fill(true).map((_, index) =>
          getKibanaMigratorTestKit({
            settings: {
              migrations: {
                discardUnknownObjects: currentVersion,
                discardCorruptObjects: currentVersion,
              },
            },
            kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
            types: typeRegistry.getAllTypes(),
            defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
            logFilePath: Path.join(__dirname, `dot_kibana_split_instance_${index}.log`),
          })
        )
      );

      const results = await Promise.all(testKits.map((testKit) => testKit.runMigrations()));
      expect(
        results
          .flat()
          .every((result) => result.status === 'migrated' || result.status === 'patched')
      ).toEqual(true);

      await esClient.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

      const breakdownAfter = await getAggregatedTypesCountAllIndices(esClient);
      expect(breakdownAfter).toEqual({
        '.kibana': {
          'apm-telemetry': 1,
          config: 1,
          space: 1,
          'ui-metric': 5,
        },
        '.kibana_alerting_cases': {},
        '.kibana_analytics': {
          dashboard: 52994,
          'index-pattern': 1,
          search: 1,
          visualization: 53004,
        },
        '.kibana_ingest': {},
        '.kibana_security_solution': {},
        '.kibana_task_manager': {
          task: 5,
        },
      });
    });

    afterEach(async () => {
      await esServer?.stop();
      await delay(2);
    });
  });
});
