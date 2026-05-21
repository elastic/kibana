/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('#pipeline-utils', () => ({
  upsertComment: jest.fn(),
}));

import { buildCommentBody, type ImpactEntry } from './notify_api_contract_owners';

const entry = (overrides: Partial<ImpactEntry> = {}): ImpactEntry => ({
  path: '/api/spaces/space',
  method: 'GET',
  reason: 'Endpoint removed',
  terraformResource: 'elasticstack_kibana_space',
  owners: ['@elastic/kibana-security'],
  ...overrides,
});

describe('buildCommentBody', () => {
  it('renders a markdown table with one entry', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('## API Contract Breaking Changes');
    expect(body).toContain('| `/api/spaces/space` `GET`');
    expect(body).toContain('elasticstack_kibana_space');
    expect(body).toContain('@elastic/kibana-security');
    expect(body).toContain('| oasdiffId | Source |');
  });

  it('deduplicates owners in the cc line', () => {
    const entries = [
      entry({ owners: ['@elastic/kibana-security'] }),
      entry({ path: '/api/spaces/space/{id}', owners: ['@elastic/kibana-security'] }),
    ];
    const body = buildCommentBody(entries);

    const ccLine = body.split('\n').find((l) => l.startsWith('cc '))!;
    const mentions = ccLine.replace('cc ', '').trim().split(' ');
    expect(mentions).toEqual(['@elastic/kibana-security']);
  });

  it('aggregates multiple distinct owners', () => {
    const entries = [
      entry({ owners: ['@elastic/kibana-security'] }),
      entry({
        path: '/api/fleet/agent_policies',
        method: 'POST',
        terraformResource: 'elasticstack_fleet_agent_policy',
        owners: ['@elastic/fleet'],
      }),
    ];
    const body = buildCommentBody(entries);

    expect(body).toContain('@elastic/kibana-security');
    expect(body).toContain('@elastic/fleet');
  });

  it('shows _unknown_ when no owners exist', () => {
    const body = buildCommentBody([entry({ owners: [] })]);

    expect(body).toContain('cc _unknown_');
  });

  it('escapes pipe characters in the reason field', () => {
    const body = buildCommentBody([entry({ reason: 'field|was|removed' })]);

    expect(body).toContain('field\\|was\\|removed');
    expect(body).not.toContain('field|was|removed');
  });

  it('escapes newlines in the reason field', () => {
    const body = buildCommentBody([entry({ reason: 'line1\nline2' })]);

    expect(body).toContain('line1 line2');
    expect(body).not.toContain('line1\nline2');
  });

  it('omits method badge when method is undefined', () => {
    const body = buildCommentBody([entry({ method: undefined })]);

    expect(body).toContain('| `/api/spaces/space` |');
    expect(body).not.toMatch(/`GET`|`POST`|`PUT`|`DELETE`/);
  });

  it('renders oasdiffId and source in the table when present', () => {
    const body = buildCommentBody([
      entry({
        oasdiffId: 'request-property-removed',
        source: '/components/schemas/Output/properties/name',
      }),
    ]);

    expect(body).toContain('`request-property-removed`');
    expect(body).toContain('`/components/schemas/Output/properties/name`');
  });

  it('renders empty cells when oasdiffId and source are missing', () => {
    const body = buildCommentBody([entry()]);
    const dataRow = body.split('\n').find((l) => l.includes('`/api/spaces/space`'))!;

    expect(dataRow).toContain('|  |  |');
  });

  it('includes granular suppression guidance in the what-to-do section', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('`oasdiffId`');
    expect(body).toContain('`source`');
    expect(body).toContain('scope the allowlist entry');
  });
});
