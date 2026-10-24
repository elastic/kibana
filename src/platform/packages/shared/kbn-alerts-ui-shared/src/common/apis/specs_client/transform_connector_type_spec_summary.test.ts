/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeResponse } from '@kbn/actions-plugin/common';
import { transformConnectorTypeSpecSummary } from './transform_connector_type_spec_summary';

const specRow: ConnectorTypeResponse = {
  id: 'test-connector',
  name: 'Test Connector',
  enabled: true,
  enabled_in_config: true,
  enabled_in_license: false,
  minimum_license_required: 'platinum',
  supported_feature_ids: ['alerting', 'workflows'],
  is_system_action_type: false,
  source: 'spec',
  is_deprecated: false,
  description: 'A test connector',
  is_experimental: true,
  is_testable: true,
  icon: 'testIcon',
  docs_url: 'https://example.com/docs',
  auth_type_ids: ['basic', 'api_key_header'],
  has_inbound_events: true,
  is_inbound_only: false,
  is_ears_experimental: false,
  actions: [{ name: 'listIncidents', description: 'List incidents', is_tool: true, scope: 'read' }],
};

describe('transformConnectorTypeSpecSummary', () => {
  it('maps a spec row to camelCase ConnectorSpecSummary', () => {
    expect(transformConnectorTypeSpecSummary(specRow)).toEqual({
      id: 'test-connector',
      displayName: 'Test Connector',
      description: 'A test connector',
      icon: 'testIcon',
      docsUrl: 'https://example.com/docs',
      minimumLicense: 'platinum',
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
        { name: 'listIncidents', description: 'List incidents', isTool: true, scope: 'read' },
      ],
    });
  });

  it('defaults isTechnicalPreview to false when is_experimental is absent', () => {
    const { is_experimental: _isExperimental, ...rest } = specRow;

    expect(transformConnectorTypeSpecSummary(rest)?.isTechnicalPreview).toBe(false);
  });

  it('returns undefined for rows that are not spec-backed', () => {
    expect(transformConnectorTypeSpecSummary({ ...specRow, source: 'stack' })).toBeUndefined();
    expect(transformConnectorTypeSpecSummary({ ...specRow, source: 'yml' })).toBeUndefined();
  });

  it.each([
    ['description', { description: undefined }],
    ['auth_type_ids', { auth_type_ids: undefined }],
    ['has_inbound_events', { has_inbound_events: undefined }],
    ['is_inbound_only', { is_inbound_only: undefined }],
    ['is_ears_experimental', { is_ears_experimental: undefined }],
    ['actions', { actions: undefined }],
  ])('returns undefined for a spec row without %s', (_field, override) => {
    expect(transformConnectorTypeSpecSummary({ ...specRow, ...override })).toBeUndefined();
  });
});
