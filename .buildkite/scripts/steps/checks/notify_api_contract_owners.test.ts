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
  path: '/api/x',
  method: 'POST',
  reason: 'Endpoint removed',
  tier: 'stable',
  ...overrides,
});

describe('buildCommentBody', () => {
  it('renders a stable section with a tier heading and table header', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('## API Contract Breaking Changes — Stable & Technical Preview');
    expect(body).toContain('### Stable (GA) (1)');
    expect(body).toContain(
      '| Endpoint | Reason | oasdiffId | Source | Terraform Resource | Owners |'
    );
    expect(body).toContain('| `/api/x` `POST` |');
  });

  it('groups changes into separate stable and tech_preview sections', () => {
    const body = buildCommentBody([
      entry({ path: '/api/stable' }),
      entry({ path: '/api/preview', tier: 'tech_preview' }),
    ]);

    expect(body).toContain('### Stable (GA) (1)');
    expect(body).toContain('### Technical Preview (1)');
    // stable section rendered before tech_preview
    expect(body.indexOf('### Stable (GA)')).toBeLessThan(body.indexOf('### Technical Preview'));
  });

  it('omits a tier section entirely when it has no entries', () => {
    const body = buildCommentBody([entry({ tier: 'tech_preview' })]);

    expect(body).toContain('### Technical Preview (1)');
    expect(body).not.toContain('### Stable (GA)');
  });

  it('flags a change that also affects the Terraform provider', () => {
    const body = buildCommentBody([
      entry({
        terraformResource: 'elasticstack_kibana_space',
        owners: ['@elastic/kibana-security'],
      }),
    ]);

    expect(body).toContain('`elasticstack_kibana_space`');
    expect(body).toContain('@elastic/kibana-security');
  });

  it('leaves the Terraform cell empty when the change maps to no provider API', () => {
    const body = buildCommentBody([entry()]);
    const dataRow = body.split('\n').find((l) => l.includes('`/api/x`'))!;

    // trailing "| <terraform> | <owners> |" both empty
    expect(dataRow).toMatch(/\|\s*\|\s*\|$/);
  });

  it('ccs deduplicated owners and falls back to _unknown_ when none', () => {
    expect(
      buildCommentBody([
        entry({ owners: ['@elastic/fleet'] }),
        entry({ path: '/api/y', owners: ['@elastic/fleet'] }),
      ])
    ).toContain('cc @elastic/fleet\n');
    expect(buildCommentBody([entry()])).toContain('cc _unknown_');
  });

  it('escapes pipe characters and newlines in the reason field', () => {
    const body = buildCommentBody([entry({ reason: 'a|b\nc' })]);

    expect(body).toContain('a\\|b c');
    expect(body).not.toContain('a|b');
  });

  it('omits the method badge when method is undefined', () => {
    const body = buildCommentBody([entry({ method: undefined })]);

    expect(body).toContain('| `/api/x` |');
    expect(body).not.toMatch(/`GET`|`POST`|`PUT`|`DELETE`/);
  });

  it('renders oasdiffId and source when present', () => {
    const body = buildCommentBody([
      entry({
        oasdiffId: 'request-property-removed',
        source: '/components/schemas/Output/properties/name',
      }),
    ]);

    expect(body).toContain('`request-property-removed`');
    expect(body).toContain('`/components/schemas/Output/properties/name`');
  });

  it('includes granular suppression guidance in the what-to-do section', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('`oasdiffId`');
    expect(body).toContain('`source`');
    expect(body).toContain('scope the allowlist entry');
  });
});
