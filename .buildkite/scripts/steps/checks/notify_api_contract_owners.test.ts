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

import { buildCommentBody, type ImpactEntry } from './notify_api_contract_owners.ts';

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

  describe('release note guidance', () => {
    const SENTENCE =
      "Add a `## Release note` section to the PR description. The release notes script publishes that text as this change's entry in the Breaking changes section of the Kibana release notes, so write it for API users: what changed, how it affects them, and what they need to do.";
    const LABEL_BULLET =
      '   - add the `release_note:breaking` PR label (replacing any other `release_note:*` label).';
    const RELEASE_NOTE_BULLET =
      '   - add release note text to the PR description, see the Release note section below.';
    const README_LINK = 'See the [`@kbn/api-contracts` README]';
    const OPTIONAL_PROMPT = 'Optional: release note describing the change in the PR description';

    it.each([
      ['stable', entry()],
      ['tech_preview', entry({ tier: 'tech_preview' })],
    ])('adds the Release note section for a %s gating change', (_tier, gatingEntry) => {
      const body = buildCommentBody([gatingEntry]);

      expect(body).toContain(`### Release note\n\n${SENTENCE}\n`);
    });

    it('groups the allowlist, label and release note under one If intentional step', () => {
      const body = buildCommentBody([entry()]);
      const step2 = body.slice(
        body.indexOf('2. **If intentional**:'),
        body.indexOf('### Release note')
      );

      expect(body).toContain('1. **Fix the breaking change**');
      expect(step2).toContain(
        '   - add an approved entry to [`packages/kbn-api-contracts/allowlist.json`]'
      );
      expect(step2).toContain(LABEL_BULLET);
      expect(step2).toContain(RELEASE_NOTE_BULLET);
      expect(step2.indexOf('allowlist.json')).toBeLessThan(step2.indexOf(LABEL_BULLET));
      expect(step2.indexOf(LABEL_BULLET)).toBeLessThan(step2.indexOf(RELEASE_NOTE_BULLET));
      expect(body).not.toMatch(/^3\. /m);
    });

    it('keeps the label out of the Release note section', () => {
      const body = buildCommentBody([entry()]);
      const section = body.slice(body.indexOf('### Release note'), body.lastIndexOf(README_LINK));

      expect(section).not.toContain('release_note:breaking');
      expect(section).not.toContain('label');
    });

    it('places the Release note section after What to do and the README link last', () => {
      const body = buildCommentBody([entry()]);

      expect(body.indexOf('### What to do')).toBeLessThan(body.indexOf('### Release note'));
      expect(body.indexOf('### Release note')).toBeLessThan(body.lastIndexOf(README_LINK));
      expect(body.indexOf(README_LINK)).toBe(body.lastIndexOf(README_LINK));
      expect(body.endsWith('for tier definitions and the allowlist workflow.')).toBe(true);
    });

    it('has no code fence or template heading', () => {
      const body = buildCommentBody([entry(), entry({ path: '/api/two', tier: 'tech_preview' })]);

      expect(body).not.toContain('```');
      expect(body).not.toMatch(/^#{1,2} Release note/m);
      // The heading, the pointer from the If intentional step, and the `## Release note` in the guidance.
      expect(body.match(/Release note/g)).toHaveLength(3);
    });

    it('gives an experimental-only comment no Release note section', () => {
      const body = buildCommentBody([entry({ path: '/api/exp', tier: 'experimental' })]);

      expect(body).not.toContain('### Release note');
      expect(body).not.toContain('release_note:breaking');
    });

    it.each([
      ['experimental', entry({ path: '/api/exp', tier: 'experimental' })],
      ['report-only', entry({ reportOnly: true, policyReason: 'Additive response variant.' })],
    ])('gives a %s-only comment the optional prompt once, under What to do', (_kind, change) => {
      const body = buildCommentBody([change]);

      expect(body).toContain(`### What to do\n\nNothing here blocks merge. ${OPTIONAL_PROMPT}\n`);
      expect(body.match(/release note/gi)).toHaveLength(1);
      expect(body).not.toContain('### Release note');
      expect(body).not.toContain('release_note:breaking');
    });

    it('leaves the optional prompt out of a gating comment', () => {
      const body = buildCommentBody([
        entry(),
        entry({ path: '/api/exp', tier: 'experimental' }),
        entry({ path: '/api/add', reportOnly: true, policyReason: 'Additive response variant.' }),
      ]);

      expect(body).not.toContain(OPTIONAL_PROMPT);
    });

    it('keeps the rest of the no-gating variant unchanged', () => {
      const body = buildCommentBody([
        entry({ reportOnly: true, policyReason: 'Additive response variant.' }),
        entry({ path: '/api/exp', tier: 'experimental' }),
      ]);

      expect(body).toContain(
        `### What to do\n\nNothing here blocks merge. ${OPTIONAL_PROMPT}\n\nSee the [\`@kbn/api-contracts\` README]`
      );
      expect(body).toContain('for tier definitions and the rule policy.');
      expect(body).not.toContain('**If intentional**');
    });

    describe('allowlisted changes', () => {
      const approved = entry({ path: '/api/approved', allowlisted: true });

      it.each([
        ['alone', [approved]],
        [
          'with a report-only change',
          [approved, entry({ reportOnly: true, policyReason: 'Additive response variant.' })],
        ],
        [
          'with an experimental change',
          [approved, entry({ path: '/api/exp', tier: 'experimental' })],
        ],
      ])('keeps the label and Release note section when an approved change is %s', (_, entries) => {
        const body = buildCommentBody(entries);

        expect(body).toContain('### Approved — not blocking merge (1)');
        expect(body).toContain('| `/api/approved` `GET` |');
        expect(body).toContain(
          '### What to do\n\nNothing here blocks merge. The approved breaking change(s) still ship with this PR, so:\n\n'
        );
        expect(body).toContain(LABEL_BULLET.trimStart());
        expect(body).toContain(RELEASE_NOTE_BULLET.trimStart());
        expect(body).toContain(`### Release note\n\n${SENTENCE}\n`);
        expect(body.endsWith('for tier definitions and the allowlist workflow.')).toBe(true);
        expect(body).not.toContain(OPTIONAL_PROMPT);
        expect(body).not.toContain('**If intentional**');
        expect(body).not.toContain('### Stable (GA)');
      });

      it('lists approved changes after the gating sections and keeps the gating guidance', () => {
        const body = buildCommentBody([approved, entry({ path: '/api/gating' })]);

        expect(body).toContain('### Stable (GA) (1)');
        expect(body).toContain('2. **If intentional**:');
        expect(body.indexOf('### Stable (GA)')).toBeLessThan(body.indexOf('### Approved'));
        expect(body.indexOf('### Approved')).toBeLessThan(body.indexOf('### What to do'));
      });
    });
  });
});
