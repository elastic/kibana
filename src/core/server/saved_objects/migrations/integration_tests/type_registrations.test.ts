/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REMOVED_TYPES } from '../../migrations/core';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';

// Types should NEVER be removed from this array
const previouslyRegisteredTypes = [
  'action',
  'action_task_params',
  'alert',
  'api_key_pending_invalidation',
  'apm-indices',
  'apm-server-schema',
  'apm-service-group',
  'apm-services-telemetry',
  'apm-telemetry',
  'app_search_telemetry',
  'application_usage_daily',
  'application_usage_totals',
  'application_usage_transactional',
  'background-session',
  'canvas-element',
  'canvas-workpad',
  'canvas-workpad-template',
  'cases',
  'cases-comments',
  'cases-configure',
  'cases-connector-mappings',
  'cases-sub-case',
  'cases-user-actions',
  'cases-telemetry',
  'config',
  'connector_token',
  'core-usage-stats',
  'dashboard',
  'endpoint:user-artifact',
  'endpoint:user-artifact-manifest',
  'enterprise_search_telemetry',
  'epm-packages',
  'epm-packages-assets',
  'event_loop_delays_daily',
  'exception-list',
  'exception-list-agnostic',
  'file-upload-telemetry',
  'file-upload-usage-collection-telemetry',
  'fleet-agent-actions',
  'fleet-agent-events',
  'fleet-agents',
  'fleet-enrollment-api-keys',
  'fleet-preconfiguration-deletion-record',
  'graph-workspace',
  'index-pattern',
  'infrastructure-ui-source',
  'ingest-agent-policies',
  'ingest-outputs',
  'ingest-package-policies',
  'ingest_manager_settings',
  'inventory-view',
  'kql-telemetry',
  'legacy-url-alias',
  'lens',
  'lens-ui-telemetry',
  'map',
  'maps-telemetry',
  'metrics-explorer-view',
  'ml-job',
  'ml-trained-model',
  'ml-module',
  'ml-telemetry',
  'monitoring-telemetry',
  'osquery-pack',
  'osquery-saved-query',
  'osquery-usage-metric',
  'osquery-manager-usage-metric',
  'query',
  'sample-data-telemetry',
  'search',
  'search-session',
  'search-telemetry',
  'security-rule',
  'security-solution-signals-migration',
  'server',
  'siem-detection-engine-rule-actions',
  'siem-detection-engine-rule-execution-info',
  'siem-detection-engine-rule-status',
  'siem-ui-timeline',
  'siem-ui-timeline-note',
  'siem-ui-timeline-pinned-event',
  'space',
  'spaces-usage-stats',
  'tag',
  'task',
  'telemetry',
  'timelion-sheet',
  'tsvb-validation-telemetry',
  'ui-counter',
  'ui-metric',
  'upgrade-assistant-ml-upgrade-operation',
  'upgrade-assistant-reindex-operation',
  'upgrade-assistant-telemetry',
  'uptime-dynamic-settings',
  'url',
  'usage-counters',
  'visualization',
  'workplace_search_telemetry',
].sort();

describe('SO type registrations', () => {
  it('does not remove types from registrations without updating unusedTypesQuery', async () => {
    const root = kbnTestServer.createRoot({}, { oss: false });
    await root.preboot();
    const setup = await root.setup();
    const currentlyRegisteredTypes = setup.savedObjects
      .getTypeRegistry()
      .getAllTypes()
      .map(({ name }) => name)
      .sort();
    await root.shutdown();

    // Make sure that all `REMOVED_TYPES` are in `previouslyRegisteredTypes`
    expect(previouslyRegisteredTypes.filter((type) => REMOVED_TYPES.includes(type))).toEqual(
      REMOVED_TYPES // Use array comparison for readable test failure messages
    );
    // Make sure that no `REMOVED_TYPES` are in `currentlyRegisteredTypes`
    expect(currentlyRegisteredTypes.filter((type) => REMOVED_TYPES.includes(type))).toEqual([]);

    // Make sure all new types are added to `previouslyRegisteredTypes`
    // If this assertion fails, add the new type name to the `previouslyRegisteredTypes` array above (alphabetically)
    const typesMissingFromPrevious = currentlyRegisteredTypes.filter(
      (type) => !previouslyRegisteredTypes.includes(type)
    );
    expect(typesMissingFromPrevious).toEqual([]);

    // Make sure all removed types are added to `REMOVED_TYPES`
    // If this assertion fails, add the removed type to `REMOVED_TYPES` array in ../../migrations/core/elastic_index.ts
    expect(previouslyRegisteredTypes.filter((type) => !REMOVED_TYPES.includes(type))).toEqual(
      currentlyRegisteredTypes
    );
  });
});
