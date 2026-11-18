/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../../connector_spec';
import type { ConnectorArtifactFacts } from './connector_coverage';
import {
  buildCoverageDocument,
  getAuthTypeFacts,
  getAvailability,
  getDirection,
  getEmulationBlocker,
  getExemptApiType,
  getMockResponses,
  getOauthEmulation,
  getRecordedApiType,
} from './connector_coverage';
import type { VendorApiManifest } from '../manifest';

const spec = (id: string, actions: string[], events: string[] = []): ConnectorSpec =>
  ({
    metadata: { id },
    actions: Object.fromEntries(actions.map((name) => [name, {}])),
    ...(events.length > 0
      ? { events: { definitions: Object.fromEntries(events.map((name) => [name, {}])) } }
      : {}),
  } as unknown as ConnectorSpec);

const manifest = (...formats: string[]): VendorApiManifest =>
  ({
    operations: {},
    sources: Object.fromEntries(
      formats.map((format, index) => [
        `v${index}`,
        { format, url: 'https://example.com/spec', fetchedAt: '2026-01-01T00:00:00.000Z' },
      ])
    ),
  } as unknown as VendorApiManifest);

const facts = (overrides: Partial<ConnectorArtifactFacts> = {}): ConnectorArtifactFacts => ({
  authTypes: [{ type: 'bearer' }],
  servedTokenUrls: [],
  hasFixtures: false,
  hasRecordings: false,
  hasEmulatorResponses: false,
  specDirectory: 'specs/example',
  ...overrides,
});

describe('getDirection', () => {
  it.each([
    ['outbound', spec('.a', ['run'])],
    ['inbound', spec('.b', [], ['pushed'])],
    ['both', spec('.c', ['run'], ['pushed'])],
  ])('reports %s', (direction, connector) => {
    expect(getDirection(connector)).toBe(direction);
  });
});

describe('getExemptApiType', () => {
  it.each([
    ['MCP connector: all actions go through the hosted MCP server', 'mcp'],
    ['Talks to Azure SQL Database through the mssql driver', 'database'],
    ['GraphQL-only: every action POSTs a query to NerdGraph', 'graphql'],
    ['JSON-RPC 2.0 API: every call is a POST to a single endpoint', 'jsonrpc'],
    [
      'Inbound webhook receiver. It makes no outbound requests to any vendor API.',
      'not_an_api_client',
    ],
    ['Signs tokens locally. It sends no requests to a vendor API.', 'not_an_api_client'],
    ['Generic connector: the caller picks the path', 'generic'],
    ['Self-hosted Jenkins at a user-configured base URL', 'self_hosted'],
    ['On-premises SharePoint Server REST API. Microsoft publishes no OpenAPI.', 'self_hosted'],
    ['The endpoints were deprecated. The connector needs to migrate to /v3/.', 'spec_mismatch'],
    ['AbuseIPDB publishes only HTML docs and no OpenAPI/Swagger', 'no_public_spec'],
    ['No static, vendor-published OpenAPI for the core REST API', 'no_public_spec'],
    ['The spec is served per tenant, behind authentication', 'no_public_spec'],
    ['Something nobody wrote a rule for', 'other'],
  ])('reads %s as %s', (reason, apiType) => {
    expect(getExemptApiType(reason)).toBe(apiType);
  });
});

describe('getRecordedApiType', () => {
  it('maps Markdown formats to markdown', () => {
    expect(getRecordedApiType(manifest('brave-markdown'))).toBe('markdown');
  });

  it('uses the most common source format', () => {
    expect(getRecordedApiType(manifest('swagger', 'openapi', 'openapi'))).toBe('openapi');
  });
});

describe('buildCoverageDocument', () => {
  it('marks a recorded connector as emulated and drift protected', () => {
    expect(
      buildCoverageDocument({
        spec: spec('.drive', ['list']),
        manifest: manifest('discovery'),
        facts: facts(),
      })
    ).toMatchObject({
      connector_id: '.drive',
      direction: 'outbound',
      api_type: 'discovery',
      emulated: true,
      drift_protection: 'full',
    });
  });

  it('keeps the reason of an exempt connector', () => {
    expect(
      buildCoverageDocument({
        spec: spec('.sql', ['query']),
        exemptionReason: 'Talks to the database through a driver',
        facts: facts(),
      })
    ).toMatchObject({
      connector_id: '.sql',
      direction: 'outbound',
      api_type: 'database',
      emulated: false,
      drift_protection: 'none',
      exemption_reason: 'Talks to the database through a driver',
    });
  });

  it('marks a connector that is neither recorded nor exempt as unexplained', () => {
    expect(
      buildCoverageDocument({ spec: spec('.threatq', ['search']), facts: facts() })
    ).toMatchObject({
      connector_id: '.threatq',
      direction: 'outbound',
      api_type: 'unexplained',
      emulated: false,
      drift_protection: 'none',
    });
  });
});

const oauth = (tokenUrl?: string) => ({
  type: 'oauth_authorization_code',
  ...(tokenUrl ? { tokenUrl } : {}),
});

describe('getAuthTypeFacts', () => {
  it('reads string and object auth types, with a default token URL', () => {
    expect(
      getAuthTypeFacts({
        auth: {
          types: [
            'bearer',
            { type: 'oauth_authorization_code', defaults: { tokenUrl: 'https://a/token' } },
            { type: 'oauth_client_credentials', defaults: {} },
          ],
        },
      } as unknown as ConnectorSpec)
    ).toEqual([
      { type: 'bearer' },
      { type: 'oauth_authorization_code', tokenUrl: 'https://a/token' },
      { type: 'oauth_client_credentials' },
    ]);
  });

  it('returns nothing for a spec without auth', () => {
    expect(getAuthTypeFacts({} as unknown as ConnectorSpec)).toEqual([]);
  });
});

describe('getOauthEmulation', () => {
  const served = ['https://a/token'];

  it.each([
    ['not_oauth', true, [{ type: 'bearer' }]],
    ['served', true, [oauth('https://a/token')]],
    ['token_url_not_served', true, [oauth('https://b/token')]],
    ['token_url_user_set', true, [oauth()]],
    ['no_vendor_spec', false, [oauth('https://a/token')]],
    ['served', true, [oauth('https://b/token'), oauth('https://a/token')]],
    ['token_url_not_served', true, [oauth(), oauth('https://b/token')]],
  ])('reports %s', (expected, emulated, authTypes) => {
    expect(getOauthEmulation({ emulated, facts: { authTypes, servedTokenUrls: served } })).toBe(
      expected
    );
  });
});

describe('getEmulationBlocker', () => {
  const served = ['https://a/token'];
  const blocker = (emulated: boolean, authTypes: ConnectorArtifactFacts['authTypes']) =>
    getEmulationBlocker({ emulated, facts: { authTypes, servedTokenUrls: served } });

  it.each([
    ['no_vendor_spec', false, [{ type: 'bearer' }]],
    ['none', true, [{ type: 'bearer' }]],
    ['none', true, [oauth('https://a/token')]],
    ['none', true, [oauth(), { type: 'api_key_header' }]],
    ['oauth_token_url_not_served', true, [oauth('https://b/token')]],
    ['oauth_token_url_user_set', true, [oauth()]],
    ['gcp_token_bypasses_proxy', true, [{ type: 'gcp_service_account' }]],
    ['unchecked_auth', true, [{ type: 'ears' }]],
    ['unchecked_auth', true, [{ type: 'aws_credentials' }]],
    ['unchecked_auth', true, [{ type: 'ears' }, { type: 'gcp_service_account' }]],
  ])('reports %s', (expected, emulated, authTypes) => {
    expect(blocker(emulated, authTypes)).toBe(expected);
  });
});

describe('getMockResponses', () => {
  const sources = (overrides: Partial<Parameters<typeof getMockResponses>[0]> = {}) => ({
    emulated: true,
    hasFixtures: false,
    hasRecordings: false,
    hasEmulatorResponses: false,
    ...overrides,
  });

  it.each([
    ['recordings', sources({ hasFixtures: true, hasRecordings: true, hasEmulatorResponses: true })],
    ['emulator_responses', sources({ hasFixtures: true, hasEmulatorResponses: true })],
    ['fixtures', sources({ hasFixtures: true })],
    ['generated', sources()],
    ['none', sources({ emulated: false })],
  ])('reports %s', (expected, input) => {
    expect(getMockResponses(input)).toBe(expected);
  });
});

describe('buildCoverageDocument facts', () => {
  it('describes an emulatable connector with realistic mocks', () => {
    expect(
      buildCoverageDocument({
        spec: spec('.figma', ['getMe']),
        manifest: manifest('openapi'),
        facts: facts({
          authTypes: [oauth('https://a/token'), { type: 'api_key_header' }],
          servedTokenUrls: ['https://a/token'],
          hasFixtures: true,
          hasEmulatorResponses: true,
        }),
      })
    ).toEqual({
      connector_id: '.figma',
      direction: 'outbound',
      auth_methods: ['oauth_authorization_code', 'api_key_header'],
      auth_summary: 'oauth_authorization_code, api_key_header',
      emulatable: true,
      emulation_blocker: 'none',
      supported_features: [],
      available_in_workflows: false,
      available_in_agent_builder: false,
      availability: 'neither',
      tool_actions: 0,
      oauth_emulation: 'served',
      drift_checkable: true,
      mock_responses: 'emulator_responses',
      realistic_mocks: true,
      spec_directory: 'specs/example',
      api_type: 'openapi',
      emulated: true,
      drift_protection: 'full',
    });
  });

  it('does not count hand-written fixtures as realistic mocks', () => {
    expect(
      buildCoverageDocument({
        spec: spec('.shodan', ['host']),
        manifest: manifest('openapi'),
        facts: facts({ hasFixtures: true }),
      })
    ).toMatchObject({ mock_responses: 'fixtures', realistic_mocks: false });
  });

  it('explains why an exempt connector is not emulatable', () => {
    expect(
      buildCoverageDocument({
        spec: spec('.salesforce', ['query']),
        exemptionReason: 'No static, vendor-published OpenAPI',
        facts: facts({ authTypes: [oauth()] }),
      })
    ).toMatchObject({
      emulatable: false,
      emulation_blocker: 'no_vendor_spec',
      oauth_emulation: 'no_vendor_spec',
      drift_checkable: false,
      mock_responses: 'none',
      realistic_mocks: false,
    });
  });
});

describe('getAvailability', () => {
  const withFeatures = (features: string[], actions: Record<string, { isTool?: boolean }> = {}) =>
    ({
      metadata: { id: '.x', supportedFeatureIds: features },
      actions,
    } as unknown as ConnectorSpec);

  it.each([
    ['both', ['workflows', 'agentBuilder', 'contextEngine']],
    ['both', ['agentBuilder', 'workflows']],
    ['workflows_only', ['workflows']],
    ['agent_builder_only', ['agentBuilder']],
    ['neither', ['alerting']],
    ['neither', []],
  ])('reports %s for %j', (availability, features) => {
    expect(getAvailability(withFeatures(features))).toMatchObject({
      availability,
      available_in_workflows: features.includes('workflows'),
      available_in_agent_builder: features.includes('agentBuilder'),
      supported_features: features,
    });
  });

  it('counts the actions an agent may call as tools', () => {
    expect(
      getAvailability(
        withFeatures(['agentBuilder'], {
          a: { isTool: true },
          b: {},
          c: { isTool: false },
          d: { isTool: true },
        })
      ).tool_actions
    ).toBe(2);
  });

  it('is part of every document', () => {
    expect(
      buildCoverageDocument({
        spec: withFeatures(['workflows', 'agentBuilder'], { a: { isTool: true } }),
        manifest: manifest('openapi'),
        facts: facts(),
      })
    ).toMatchObject({ availability: 'both', tool_actions: 1 });
  });
});
