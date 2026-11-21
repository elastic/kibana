/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformConnectorSpecResponse } from './transform_connector_spec_response';

describe('transformConnectorSpecResponse', () => {
  it('maps snake_case metadata to ConnectorMetadata', () => {
    const result = transformConnectorSpecResponse({
      metadata: {
        id: '.my-connector',
        display_name: 'My connector',
        description: 'Does things',
        minimum_license: 'basic',
        supported_feature_ids: ['alerting'],
        icon: 'logoElastic',
        docs_url: 'https://example.com/docs',
        is_technical_preview: true,
      },
      schema: { type: 'object', properties: {} },
      action_schemas: {
        sendMessage: {
          input: { type: 'object', properties: { text: { type: 'string' } } },
          description: 'Send a message',
          scope: 'write',
        },
      },
      alerting: {
        default_action: 'sendMessage',
        message_field: 'text',
      },
      is_testable: true,
      actions: [],
    });

    expect(result.metadata).toEqual({
      id: '.my-connector',
      displayName: 'My connector',
      description: 'Does things',
      minimumLicense: 'basic',
      supportedFeatureIds: ['alerting'],
      icon: 'logoElastic',
      docsUrl: 'https://example.com/docs',
      isTechnicalPreview: true,
    });
    expect(result.schema).toEqual({ type: 'object', properties: {} });
    expect(result.actionSchemas).toEqual({
      sendMessage: {
        input: { type: 'object', properties: { text: { type: 'string' } } },
        description: 'Send a message',
        scope: 'write',
      },
    });
    expect(result.alerting).toEqual({
      defaultAction: 'sendMessage',
      messageField: 'text',
    });
    expect(result.isTestable).toBe(true);
  });

  it('omits optional metadata fields when absent on the wire', () => {
    const result = transformConnectorSpecResponse({
      metadata: {
        id: 'c',
        display_name: 'C',
        description: 'D',
        minimum_license: 'gold',
        supported_feature_ids: ['cases'],
      },
      schema: {},
      action_schemas: {},
      is_testable: false,
    });

    expect(result.metadata).toEqual({
      id: 'c',
      displayName: 'C',
      description: 'D',
      minimumLicense: 'gold',
      supportedFeatureIds: ['cases'],
    });
    expect(result.actionSchemas).toEqual({});
    expect(result.alerting).toBeUndefined();
    expect(result.isTestable).toBe(false);
  });

  it('transforms actions from wire format to client format', () => {
    const result = transformConnectorSpecResponse({
      metadata: {
        id: '.test',
        display_name: 'Test',
        description: 'Test connector',
        minimum_license: 'basic',
        supported_feature_ids: ['agentBuilder'],
      },
      schema: {},
      is_testable: false,
      actions: [
        { name: 'listIncidents', description: 'List incidents', is_tool: true },
        { name: 'getIncident', is_tool: true },
      ],
    });

    expect(result.actions).toEqual([
      { name: 'listIncidents', description: 'List incidents', isTool: true },
      { name: 'getIncident', isTool: true },
    ]);
  });
});
