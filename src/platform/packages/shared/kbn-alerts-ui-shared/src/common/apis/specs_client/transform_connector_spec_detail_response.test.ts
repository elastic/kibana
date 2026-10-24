/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GetConnectorSpecResponse } from '@kbn/actions-plugin/common';
import { transformConnectorSpecDetailResponse } from './transform_connector_spec_detail_response';

const formSchema = {
  type: 'object',
  properties: {
    config: { type: 'object', properties: {} },
    secrets: { type: 'object', properties: {} },
  },
};

const inputSchema = { type: 'object', properties: { id: { type: 'string' } } };

const fullWire: GetConnectorSpecResponse = {
  metadata: {
    id: 'test-connector',
    display_name: 'Test Connector',
    description: 'A test connector',
    minimum_license: 'gold',
    supported_feature_ids: ['alerting'],
    icon: 'testIcon',
    docs_url: 'https://example.com/docs',
    is_technical_preview: true,
  },
  schema: formSchema,
  is_testable: true,
  auth_type_ids: ['basic'],
  has_inbound_events: false,
  is_inbound_only: false,
  is_ears_experimental: false,
  actions: [
    {
      name: 'listIncidents',
      description: 'List incidents',
      is_tool: true,
      scope: 'read',
      input_schema: inputSchema,
    },
  ],
};

describe('transformConnectorSpecDetailResponse', () => {
  it('maps a full wire body to camelCase ConnectorSpecDetail', () => {
    expect(transformConnectorSpecDetailResponse(fullWire)).toEqual({
      id: 'test-connector',
      displayName: 'Test Connector',
      description: 'A test connector',
      icon: 'testIcon',
      docsUrl: 'https://example.com/docs',
      minimumLicense: 'gold',
      isTechnicalPreview: true,
      supportedFeatureIds: ['alerting'],
      authTypeIds: ['basic'],
      isTestable: true,
      hasInboundEvents: false,
      isInboundOnly: false,
      isEarsExperimental: false,
      formSchema,
      actions: [
        {
          name: 'listIncidents',
          description: 'List incidents',
          isTool: true,
          scope: 'read',
          inputSchema,
        },
      ],
    });
  });

  it('omits optional icon and docsUrl when absent on the wire', () => {
    const result = transformConnectorSpecDetailResponse({
      ...fullWire,
      metadata: {
        id: fullWire.metadata.id,
        display_name: fullWire.metadata.display_name,
        description: fullWire.metadata.description,
        minimum_license: fullWire.metadata.minimum_license,
        supported_feature_ids: fullWire.metadata.supported_feature_ids,
      },
    });

    expect(result).not.toHaveProperty('skill');
    expect(result).not.toHaveProperty('availability');
    expect(result).not.toHaveProperty('icon');
    expect(result).not.toHaveProperty('docsUrl');
    expect(result.isTechnicalPreview).toBe(false);
    expect(result.formSchema).toBe(formSchema);
  });
});
