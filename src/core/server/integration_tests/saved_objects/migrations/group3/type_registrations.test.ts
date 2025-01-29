/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REMOVED_TYPES } from '@kbn/core-saved-objects-migration-server-internal';
import { createRoot } from '@kbn/core-test-helpers-kbn-server';

// Types should NEVER be removed from this array
const previouslyRegisteredTypes = [
  'action',
  'action_task_params',
  'ad_hoc_run_params',
  'alert',
  'api_key_pending_invalidation',
  'apm-custom-dashboards',
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
  'background-task-node',
  'canvas-element',
  'canvas-workpad',
  'canvas-workpad-template',
  'cloud',
  'cloud-security-posture-settings',
  'cases',
  'cases-comments',
  'cases-configure',
  'cases-connector-mappings',
  'cases-rules',
  'cases-sub-case',
  'cases-user-actions',
  'cases-telemetry',
  'config',
  'config-global',
  'connector_token',
  'core-usage-stats',
  'csp-rule-template',
  'csp_rule',
  'dashboard',
  'dynamic-config-overrides', // Added in 8.16 to persist the dynamic config overrides and share it with other nodes
  'event-annotation-group',
  'endpoint:user-artifact',
  'endpoint:user-artifact-manifest',
  'endpoint:unified-user-artifact-manifest',
  'enterprise_search_telemetry',
  'entity-definition',
  'entity-discovery-api-key',
  'epm-packages',
  'epm-packages-assets',
  'event_loop_delays_daily',
  'exception-list',
  'exception-list-agnostic',
  'favorites',
  'file',
  'fileShare',
  'file-upload-telemetry',
  'file-upload-usage-collection-telemetry',
  'fleet-agent-actions',
  'fleet-agent-events',
  'fleet-agent-policies',
  'fleet-package-policies',
  'fleet-agents',
  'fleet-enrollment-api-keys',
  'fleet-fleet-server-host',
  'fleet-message-signing-keys',
  'fleet-preconfiguration-deletion-record',
  'fleet-proxy',
  'fleet-uninstall-tokens',
  'fleet-setup-lock',
  'fleet-space-settings',
  'graph-workspace',
  'guided-setup-state',
  'guided-onboarding-guide-state',
  'guided-onboarding-plugin-state',
  'index-pattern',
  'infrastructure-monitoring-log-view',
  'infrastructure-ui-source',
  'infra-custom-dashboards',
  'ingest-agent-policies',
  'ingest-download-sources',
  'ingest-outputs',
  'ingest-package-policies',
  'ingest_manager_settings',
  'inventory-view',
  'kql-telemetry',
  'legacy-url-alias',
  'lens',
  'lens-ui-telemetry',
  'links',
  'maintenance-window',
  'map',
  'maps-telemetry',
  'metrics-data-source',
  'metrics-explorer-view',
  'ml-job',
  'ml-trained-model',
  'ml-module',
  'ml-telemetry',
  'monitoring-telemetry',
  'observability-onboarding-state',
  'osquery-pack',
  'osquery-pack-asset',
  'osquery-saved-query',
  'osquery-usage-metric',
  'osquery-manager-usage-metric',
  'policy-settings-protection-updates-note',
  'product-doc-install-status',
  'query',
  'rules-settings',
  'sample-data-telemetry',
  'search',
  'search-session',
  'search-telemetry',
  'security-ai-prompt',
  'security-rule',
  'security-solution-signals-migration',
  'risk-engine-configuration',
  'entity-engine-status',
  'server',
  'siem-detection-engine-rule-actions',
  'siem-detection-engine-rule-execution-info',
  'siem-detection-engine-rule-status',
  'siem-ui-timeline',
  'siem-ui-timeline-note',
  'siem-ui-timeline-pinned-event',
  'slo',
  'slo-settings',
  'space',
  'spaces-usage-stats',
  'synthetics-monitor',
  'synthetics-param',
  'synthetics-privates-locations',
  'synthetics-private-location',
  'tag',
  'task',
  'telemetry',
  'timelion-sheet',
  'tsvb-validation-telemetry',
  'threshold-explorer-view',
  'ui-counter',
  'ui-metric',
  'upgrade-assistant-ml-upgrade-operation',
  'upgrade-assistant-reindex-operation',
  'upgrade-assistant-telemetry',
  'uptime-dynamic-settings',
  'synthetics-dynamic-settings',
  'uptime-synthetics-api-key',
  'url',
  'usage-counter', // added in 8.16.0: richer mappings, located in .kibana_usage_counters
  'usage-counters', // deprecated in favor of 'usage-counter'
  'visualization',
  'workplace_search_telemetry',
].sort();

describe('SO type registrations', () => {
  let root: ReturnType<typeof createRoot>;

  afterEach(async () => {
    try {
      await root?.shutdown();
    } catch (e) {
      /* trap */
    }
  });

  it('does not remove types from registrations without updating excludeOnUpgradeQuery', async () => {
    root = createRoot({}, { oss: false });
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
