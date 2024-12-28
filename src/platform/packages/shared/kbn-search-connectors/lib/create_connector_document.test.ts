/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConnectorStatus } from '../types/connectors';

import { createConnectorDocument } from './create_connector_document';

describe('createConnectorDocument', () => {
  it('should create a connector document', () => {
    expect(
      createConnectorDocument({
        indexName: 'indexName',
        isNative: false,
        language: 'fr',
        name: 'indexName-name',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        serviceType: null,
      })
    ).toEqual({
      api_key_id: null,
      api_key_secret_id: null,
      configuration: {},
      custom_scheduling: {},
      description: null,
      error: null,
      features: null,
      filtering: [
        {
          active: {
            advanced_snippet: {
              created_at: expect.any(String),
              updated_at: expect.any(String),
              value: {},
            },
            rules: [
              {
                created_at: expect.any(String),
                field: '_',
                id: 'DEFAULT',
                order: 0,
                policy: 'include',
                rule: 'regex',
                updated_at: expect.any(String),
                value: '.*',
              },
            ],
            validation: {
              errors: [],
              state: 'valid',
            },
          },
          domain: 'DEFAULT',
          draft: {
            advanced_snippet: {
              created_at: expect.any(String),
              updated_at: expect.any(String),
              value: {},
            },
            rules: [
              {
                created_at: expect.any(String),
                field: '_',
                id: 'DEFAULT',
                order: 0,
                policy: 'include',
                rule: 'regex',
                updated_at: expect.any(String),
                value: '.*',
              },
            ],
            validation: {
              errors: [],
              state: 'valid',
            },
          },
        },
      ],
      index_name: 'indexName',
      is_native: false,
      language: 'fr',
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
      name: 'indexName-name',
      pipeline: {
        extract_binary_content: true,
        name: 'ent-search-generic-ingestion',
        reduce_whitespace: true,
        run_ml_inference: false,
      },
      scheduling: {
        access_control: { enabled: false, interval: '0 0 0 * * ?' },
        full: { enabled: false, interval: '0 0 0 * * ?' },
        incremental: { enabled: false, interval: '0 0 0 * * ?' },
      },
      service_type: null,
      status: ConnectorStatus.CREATED,
      sync_now: false,
    });
  });
});
