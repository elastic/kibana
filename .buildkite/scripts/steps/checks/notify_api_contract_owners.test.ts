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
  tier: 'stable',
  ...overrides,
});

describe('buildCommentBody', () => {
  it('renders a stable section with a tier heading and table header', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('## API Contract Breaking Changes');
    expect(body).toContain('### Stable (GA) (1)');
    expect(body).toContain('| Endpoint | Reason | oasdiffId | Source |');
    expect(body).toContain('| `/api/spaces/space` `GET` |');
  });

  it('groups changes into separate availability sections', () => {
    const body = buildCommentBody([
      entry({ path: '/api/spaces/space' }),
      entry({ path: '/api/fleet/agent_policies', method: 'POST', tier: 'tech_preview' }),
      entry({ path: '/api/features', tier: 'experimental' }),
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

  it('renders experimental changes in a clearly non-blocking section after the gating tiers', () => {
    const body = buildCommentBody([
      entry({ path: '/api/spaces/space', tier: 'stable' }),
      entry({ path: '/api/exp', tier: 'experimental' }),
    ]);

    expect(body).toContain('### Experimental — informational, not blocking merge (1)');
    expect(body).toContain('do not fail this check');
    expect(body).toContain('| `/api/exp` `GET` |');
    // gating tier rendered before the experimental section
    expect(body.indexOf('### Stable (GA)')).toBeLessThan(body.indexOf('### Experimental'));
  });

  it('posts an experimental-only comment with no gating section', () => {
    const body = buildCommentBody([entry({ path: '/api/exp', tier: 'experimental' })]);

    expect(body).toContain('### Experimental — informational, not blocking merge (1)');
    expect(body).not.toContain('### Stable (GA)');
    expect(body).not.toContain('### Technical Preview');
  });

  it('escapes pipe characters and newlines in the reason field', () => {
    const body = buildCommentBody([entry({ reason: 'a|b\nc' })]);

    expect(body).toContain('a\\|b c');
    expect(body).not.toContain('a|b');
  });

  it('omits the method badge when method is undefined', () => {
    const body = buildCommentBody([entry({ method: undefined })]);

    expect(body).toContain('| `/api/spaces/space` |');
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
