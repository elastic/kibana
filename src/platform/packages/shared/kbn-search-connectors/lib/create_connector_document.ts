/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Connector,
  ConnectorConfiguration,
  ConnectorDocument,
  ConnectorStatus,
  FilteringValidationState,
  IngestPipelineParams,
} from '../types/connectors';

export function createConnectorDocument({
  configuration,
  features,
  indexName,
  isNative,
  name,
  pipeline,
  serviceType,
  language,
}: {
  configuration?: ConnectorConfiguration;
  features?: Connector['features'];
  indexName: string | null;
  isNative: boolean;
  language: string | null;
  name?: string;
  pipeline?: IngestPipelineParams | null;
  serviceType: string | null;
}): ConnectorDocument {
  const currentTimestamp = new Date().toISOString();

  return {
    api_key_id: null,
    api_key_secret_id: null,
    configuration: configuration || {},
    custom_scheduling: {},
    description: null,
    error: null,
    features: features || null,
    filtering: [
      {
        active: {
          advanced_snippet: {
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            value: {},
          },
          rules: [
            {
              created_at: currentTimestamp,
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: 'include',
              rule: 'regex',
              updated_at: currentTimestamp,
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
        domain: 'DEFAULT',
        draft: {
          advanced_snippet: {
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            value: {},
          },
          rules: [
            {
              created_at: currentTimestamp,
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: 'include',
              rule: 'regex',
              updated_at: currentTimestamp,
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
      },
    ],
    index_name: indexName,
    is_native: isNative,
    language,
    last_access_control_sync_error: null,
    last_access_control_sync_scheduled_at: null,
    last_access_control_sync_status: null,
    last_deleted_document_count: null,
    last_incremental_sync_scheduled_at: null,
    last_indexed_document_count: null,
    last_seen: null,
    last_sync_error: null,
    last_sync_scheduled_at: null,
    last_sync_status: null,
    last_synced: null,
    name: name ?? '',
    pipeline,
    scheduling: {
      access_control: { enabled: false, interval: '0 0 0 * * ?' },
      full: { enabled: false, interval: '0 0 0 * * ?' },
      incremental: { enabled: false, interval: '0 0 0 * * ?' },
    },
    service_type: serviceType || null,
    status: isNative ? ConnectorStatus.NEEDS_CONFIGURATION : ConnectorStatus.CREATED,
    sync_now: false,
  };
}
