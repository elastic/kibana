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

import {
  buildCommentBody,
  dedupeByChange,
  type ImpactEntry,
} from './notify_api_contract_owners.ts';

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
    // Scoped to the table, where an unescaped pipe would break the column layout.
    // The release-note snippet repeats the reason inside a fenced code block, where
    // a raw pipe is harmless.
    const table = body.slice(0, body.indexOf('### Recommended release note'));

    expect(table).toContain('a\\|b c');
    expect(table).not.toContain('a|b');
  });

  it('JSON-escapes a newline in the reason inside the release-note snippet', () => {
    const body = buildCommentBody([entry({ reason: 'a|b\nc' })]);
    const snippet = body.slice(body.indexOf('### Recommended release note'));

    // A raw newline would terminate the YAML scalar and corrupt the document.
    expect(snippet).toContain('\\n');
    expect(snippet).not.toMatch(/title: "[^"\n]*\n[^"]*"/);
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

  it('renders report-only changes in their own non-blocking section', () => {
    const body = buildCommentBody([
      entry(),
      entry({
        path: '/api/cases/{caseId}/user_actions/_find',
        reason: 'added a variant to the payload oneOf',
        oasdiffId: 'response-property-one-of-added',
        reportOnly: true,
        policyReason: 'Adding a variant to a response oneOf is additive.',
      }),
    ]);

    // the demoted change is stable tier, but must not be counted as gating
    expect(body).toContain('### Stable (GA) (1)');
    expect(body).toContain('### Reported only — not blocking merge (1)');
    expect(body).toContain('- Adding a variant to a response oneOf is additive.');
    expect(body.indexOf('### Stable (GA)')).toBeLessThan(body.indexOf('### Reported only'));
  });

  it('posts a report-only comment with no gating section', () => {
    const body = buildCommentBody([
      entry({ reportOnly: true, policyReason: 'Additive response variant.' }),
    ]);

    expect(body).not.toContain('### Stable (GA)');
    expect(body).toContain('### Reported only — not blocking merge (1)');
  });

  it('includes granular suppression guidance in the what-to-do section', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('`oasdiffId`');
    expect(body).toContain('`source`');
    expect(body).toContain('scope the allowlist entry');
  });

  it('keeps the fix-or-allowlist framing when a gating change exists', () => {
    const body = buildCommentBody([entry(), entry({ reportOnly: true })]);

    expect(body).toContain('were detected across the public OpenAPI surface');
    expect(body).toContain('**Fix the breaking change**');
  });

  it('does not ask for a fix or an allowlist entry when nothing gates', () => {
    const body = buildCommentBody([
      entry({ reportOnly: true, policyReason: 'Additive response variant.' }),
      entry({ path: '/api/exp', tier: 'experimental' }),
    ]);

    expect(body).toContain('No stable or Technical Preview breaking changes were detected');
    expect(body).toContain('Nothing here blocks merge');
    expect(body).not.toContain('were detected across the public OpenAPI surface');
    expect(body).not.toContain('**Fix the breaking change**');
    expect(body).not.toContain('allowlist.json');
  });

  it('generates title and impact from the endpoint and reason', () => {
    const body = buildCommentBody([
      entry({
        path: '/api/alerting/rule/{id}',
        method: 'put',
        reason: "Property 'notify_when' removed",
      }),
    ]);

    expect(body).toContain('title: "PUT /api/alerting/rule/{id}: Property \'notify_when\' removed"');
    expect(body).toContain('impact: "Callers of PUT /api/alerting/rule/{id} are affected.');
    // Only the author can say what callers should do, so it stays a placeholder.
    expect(body).toContain('action: <what callers should do>');
  });

  it('notes the stable-since version in impact when present', () => {
    expect(buildCommentBody([entry({ since: '8.12.0' })])).toContain('Stable since 8.12.0.');
  });

  it('renders products when the entry carries them', () => {
    const body = buildCommentBody([entry({ products: ['cloud-serverless', 'kibana'] })]);

    expect(body).toContain('  products:\n    - cloud-serverless\n    - kibana');
  });

  it('omits products rather than guessing when the entry has none', () => {
    const body = buildCommentBody([entry()]);

    expect(body).toContain('### Recommended release note');
    expect(body).not.toContain('products:');
  });

  it('renders one release-note entry per gating change', () => {
    const body = buildCommentBody([
      entry({ path: '/api/one' }),
      entry({ path: '/api/two', tier: 'tech_preview' }),
    ]);

    expect(body.match(/type: breaking-change/g)).toHaveLength(2);
  });

  it('keeps experimental changes out of the snippet while still reporting them', () => {
    const body = buildCommentBody([
      entry({ path: '/api/stable' }),
      entry({ path: '/api/exp', tier: 'experimental' }),
    ]);
    const snippet = body.slice(body.indexOf('### Recommended release note'));

    expect(snippet).toContain('/api/stable');
    expect(snippet).not.toContain('/api/exp');
  });

  it('prompts for a changelog entry on report-only changes without generating one', () => {
    const body = buildCommentBody([
      entry({ path: '/api/stable' }),
      entry({ path: '/api/additive', reportOnly: true, policyReason: 'Additive response variant.' }),
    ]);
    const snippet = body.slice(body.indexOf('### Recommended release note'));

    expect(body).toContain('Consider adding a changelog entry if the change is noteworthy');
    expect(snippet).not.toContain('/api/additive');
  });

  it('quotes a reason containing YAML metacharacters', () => {
    const body = buildCommentBody([entry({ reason: 'response: changed #1 to "two"' })]);

    // JSON-encoded, so the colon, hash and quotes cannot break the document.
    expect(body).toContain('\\"two\\"');
    expect(body).not.toContain('title: PUT');
  });
});

describe('dedupeByChange', () => {
  const base: ImpactEntry = {
    path: '/api/x',
    method: 'GET',
    reason: 'Endpoint removed',
    tier: 'stable',
  };

  it('unions products for the same change seen in both specs', () => {
    const [merged] = dedupeByChange([
      { ...base, products: ['kibana'] },
      { ...base, products: ['cloud-serverless'] },
    ]);

    expect(merged.products).toEqual(['cloud-serverless', 'kibana']);
  });

  it('collapses the duplicate to a single row', () => {
    expect(
      dedupeByChange([
        { ...base, products: ['kibana'] },
        { ...base, products: ['cloud-serverless'] },
      ])
    ).toHaveLength(1);
  });

  it('sorts products so report read order does not change the output', () => {
    const forward = dedupeByChange([
      { ...base, products: ['kibana'] },
      { ...base, products: ['cloud-serverless'] },
    ]);
    const reverse = dedupeByChange([
      { ...base, products: ['cloud-serverless'] },
      { ...base, products: ['kibana'] },
    ]);

    expect(forward[0].products).toEqual(reverse[0].products);
  });

  it('keeps distinct changes on the same endpoint apart', () => {
    expect(
      dedupeByChange([
        { ...base, oasdiffId: 'response-property-removed' },
        { ...base, oasdiffId: 'request-property-removed' },
      ])
    ).toHaveLength(2);
  });

  it('leaves products undefined when no report declared a distribution', () => {
    const [merged] = dedupeByChange([{ ...base }]);

    expect(merged.products).toBeUndefined();
  });
});
