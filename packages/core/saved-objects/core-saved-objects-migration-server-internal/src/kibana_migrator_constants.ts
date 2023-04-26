/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';

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

// ensure plugins don't try to convert SO namespaceTypes after 8.0.0
// see https://github.com/elastic/kibana/issues/147344
export const ALLOWED_CONVERT_VERSION = '8.0.0';

export const DEFAULT_INDEX_TYPES_MAP: IndexTypesMap = {
  '.kibana_task_manager': ['task'],
  '.kibana': [
    'action',
    'action_task_params',
    'alert',
    'api_key_pending_invalidation',
    'apm-indices',
    'apm-server-schema',
    'apm-service-group',
    'apm-telemetry',
    'app_search_telemetry',
    'application_usage_daily',
    'application_usage_totals',
    'book',
    'canvas-element',
    'canvas-workpad',
    'canvas-workpad-template',
    'cases',
    'cases-comments',
    'cases-configure',
    'cases-connector-mappings',
    'cases-telemetry',
    'cases-user-actions',
    'config',
    'config-global',
    'connector_token',
    'core-usage-stats',
    'csp-rule-template',
    'dashboard',
    'endpoint:user-artifact',
    'endpoint:user-artifact-manifest',
    'enterprise_search_telemetry',
    'epm-packages',
    'epm-packages-assets',
    'event_loop_delays_daily',
    'exception-list',
    'exception-list-agnostic',
    'file',
    'file-upload-usage-collection-telemetry',
    'fileShare',
    'fleet-fleet-server-host',
    'fleet-message-signing-keys',
    'fleet-preconfiguration-deletion-record',
    'fleet-proxy',
    'graph-workspace',
    'guided-onboarding-guide-state',
    'guided-onboarding-plugin-state',
    'index-pattern',
    'infrastructure-monitoring-log-view',
    'infrastructure-ui-source',
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
    'map',
    'metrics-explorer-view',
    'ml-job',
    'ml-module',
    'ml-trained-model',
    'monitoring-telemetry',
    'osquery-manager-usage-metric',
    'osquery-pack',
    'osquery-pack-asset',
    'osquery-saved-query',
    'query',
    'rules-settings',
    'sample-data-telemetry',
    'search',
    'search-session',
    'search-telemetry',
    'searchableList',
    'security-rule',
    'security-solution-signals-migration',
    'siem-detection-engine-rule-actions',
    'siem-ui-timeline',
    'siem-ui-timeline-note',
    'siem-ui-timeline-pinned-event',
    'slo',
    'space',
    'spaces-usage-stats',
    'synthetics-monitor',
    'synthetics-param',
    'synthetics-privates-locations',
    'tag',
    'telemetry',
    'todo',
    'ui-metric',
    'upgrade-assistant-ml-upgrade-operation',
    'upgrade-assistant-reindex-operation',
    'uptime-dynamic-settings',
    'uptime-synthetics-api-key',
    'url',
    'usage-counters',
    'visualization',
    'workplace_search_telemetry',
  ],
};
