/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type IndexTypesMap = Record<string, string[]>;

export enum TypeStatus {
  Added = 'added',
  Removed = 'removed',
  Moved = 'moved',
  Untouched = 'untouched',
}

export interface TypeStatusDetails {
  currentIndex?: string;
  targetIndex?: string;
  status: TypeStatus;
}

export const MAIN_SAVED_OBJECT_INDEX = '.kibana';
export const LEGACY_SAVED_OBJECT_INDEX = '.kibana_1';

// ensure plugins don't try to convert SO namespaceTypes after 8.0.0
// see https://github.com/elastic/kibana/issues/147344
export const ALLOWED_CONVERT_VERSION = '8.0.0';

export const DEFAULT_INDEX_TYPES_MAP: IndexTypesMap = {
  '.kibana_task_manager': ['task'],
  '.kibana': [
    'core-usage-stats',
    'legacy-url-alias',
    'config',
    'config-global',
    'usage-counters',
    'guided-onboarding-guide-state',
    'guided-onboarding-plugin-state',
    'ui-metric',
    'application_usage_totals',
    'application_usage_daily',
    'event_loop_delays_daily',
    'url',
    'index-pattern',
    'sample-data-telemetry',
    'space',
    'spaces-usage-stats',
    'exception-list-agnostic',
    'exception-list',
    'telemetry',
    'file',
    'fileShare',
    'action',
    'action_task_params',
    'connector_token',
    'query',
    'kql-telemetry',
    'search-session',
    'search-telemetry',
    'file-upload-usage-collection-telemetry',
    'alert',
    'api_key_pending_invalidation',
    'rules-settings',
    'search',
    'tag',
    'graph-workspace',
    'visualization',
    'dashboard',
    'todo',
    'book',
    'searchableList',
    'lens',
    'lens-ui-telemetry',
    'map',
    'cases-comments',
    'cases-configure',
    'cases-connector-mappings',
    'cases',
    'cases-user-actions',
    'cases-telemetry',
    'canvas-element',
    'canvas-workpad',
    'canvas-workpad-template',
    'slo',
    'ingest_manager_settings',
    'ingest-agent-policies',
    'ingest-outputs',
    'ingest-package-policies',
    'epm-packages',
    'epm-packages-assets',
    'fleet-preconfiguration-deletion-record',
    'ingest-download-sources',
    'fleet-fleet-server-host',
    'fleet-proxy',
    'fleet-message-signing-keys',
    'osquery-manager-usage-metric',
    'osquery-saved-query',
    'osquery-pack',
    'osquery-pack-asset',
    'csp-rule-template',
    'ml-job',
    'ml-trained-model',
    'ml-module',
    'uptime-dynamic-settings',
    'synthetics-privates-locations',
    'synthetics-monitor',
    'uptime-synthetics-api-key',
    'synthetics-param',
    'siem-ui-timeline-note',
    'siem-ui-timeline-pinned-event',
    'siem-detection-engine-rule-actions',
    'security-rule',
    'siem-ui-timeline',
    'endpoint:user-artifact',
    'endpoint:user-artifact-manifest',
    'security-solution-signals-migration',
    'infrastructure-ui-source',
    'metrics-explorer-view',
    'inventory-view',
    'infrastructure-monitoring-log-view',
    'upgrade-assistant-reindex-operation',
    'upgrade-assistant-ml-upgrade-operation',
    'monitoring-telemetry',
    'enterprise_search_telemetry',
    'app_search_telemetry',
    'workplace_search_telemetry',
    'apm-indices',
    'apm-telemetry',
    'apm-server-schema',
    'apm-service-group',
  ],
};
