/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  transformConnectorSpecSummaryResponse,
  type ConnectorSpecSummaryWire,
} from './transform_connector_spec_summary_response';

const fullWire: ConnectorSpecSummaryWire = {
  id: 'test-connector',
  display_name: 'Test Connector',
  description: 'A test connector',
  icon: 'testIcon',
  docs_url: 'https://example.com/docs',
  minimum_license: 'gold',
  is_technical_preview: true,
  supported_feature_ids: ['alerting', 'workflows'],
  availability: {
    enabled: true,
    enabled_in_config: true,
    enabled_in_license: false,
    is_deprecated: false,
  },
  auth_type_ids: ['basic', 'api_key_header'],
  is_testable: true,
  has_inbound_events: true,
  is_inbound_only: false,
  is_ears_experimental: false,
  actions: [
    {
      name: 'listIncidents',
      description: 'List incidents',
      is_tool: true,
      scope: 'read',
    },
  ],
};

describe('transformConnectorSpecSummaryResponse', () => {
  it('maps a full wire body to camelCase ConnectorSpecSummary', () => {
    expect(transformConnectorSpecSummaryResponse(fullWire)).toEqual({
      id: 'test-connector',
      displayName: 'Test Connector',
      description: 'A test connector',
      icon: 'testIcon',
      docsUrl: 'https://example.com/docs',
      minimumLicense: 'gold',
      isTechnicalPreview: true,
      supportedFeatureIds: ['alerting', 'workflows'],
      availability: {
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: false,
        isDeprecated: false,
      },
      authTypeIds: ['basic', 'api_key_header'],
      isTestable: true,
      hasInboundEvents: true,
      isInboundOnly: false,
      isEarsExperimental: false,
      actions: [
        {
          name: 'listIncidents',
          description: 'List incidents',
          isTool: true,
          scope: 'read',
        },
      ],
    });
  });

  it('omits optional icon and docsUrl and action description when absent', () => {
    const { icon, docs_url: _docsUrl, ...rest } = fullWire;
    const result = transformConnectorSpecSummaryResponse({
      ...rest,
      actions: [{ name: 'ping', is_tool: false, scope: 'write' }],
    });

    expect(result).not.toHaveProperty('icon');
    expect(result).not.toHaveProperty('docsUrl');
    expect(result.actions[0]).toEqual({ name: 'ping', isTool: false, scope: 'write' });
    expect(result.actions[0]).not.toHaveProperty('description');
  });
});
