/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatFailure } from './format_failure';
import { README_LINK } from './links';
import type { ImpactReportEntry } from './write_impact_report';

const stableEntry = (path: string, reason = 'Endpoint removed'): ImpactReportEntry => ({
  path,
  reason,
  tier: 'stable',
});

const techPreviewEntry = (
  path: string,
  method: string,
  reason = 'HTTP method removed'
): ImpactReportEntry => ({ path, method, reason, tier: 'tech_preview' });

const experimentalEntry = (path: string, reason = 'Endpoint removed'): ImpactReportEntry => ({
  path,
  reason,
  tier: 'experimental',
});

const expectOutputContains = (output: string, ...substrings: string[]) => {
  substrings.forEach((substring) => {
    expect(output).toContain(substring);
  });
};

describe('formatFailure', () => {
  it('formats a single detected change with its tier', () => {
    const output = formatFailure([stableEntry('/api/test')]);

    expectOutputContains(
      output,
      'API CONTRACT BREAKING CHANGES DETECTED',
      'Detected 1 breaking change(s) in stable/tech_preview APIs (1 stable, 0 tech_preview)',
      '1. Endpoint removed',
      'Path: /api/test',
      'Tier: Stable (GA)',
      'What to do next:'
    );
  });

  it('orders stable before tech_preview and reports per-tier counts', () => {
    const output = formatFailure([
      techPreviewEntry('/api/preview', 'delete'),
      stableEntry('/api/old'),
    ]);

    expectOutputContains(
      output,
      'Detected 2 breaking change(s) in stable/tech_preview APIs (1 stable, 1 tech_preview)',
      'Tier: Stable (GA)',
      'Tier: Technical Preview',
      'Method: DELETE'
    );
    // stable ordered first regardless of input order
    expect(output.indexOf('/api/old')).toBeLessThan(output.indexOf('/api/preview'));
  });

  it('lists experimental changes in a non-blocking section and excludes them from the count', () => {
    const output = formatFailure([stableEntry('/api/old'), experimentalEntry('/api/exp')]);

    expectOutputContains(
      output,
      // count reflects only the gating (stable/tech_preview) change
      'Detected 1 breaking change(s) in stable/tech_preview APIs (1 stable, 0 tech_preview)',
      'Informational — not blocking merge',
      'Tier: Experimental',
      '/api/exp'
    );
  });

  it('omits the informational section when there are no experimental changes', () => {
    const output = formatFailure([stableEntry('/api/old')]);

    expect(output).not.toContain('Informational — not blocking merge');
  });

  it('lists report-only changes separately and excludes them from the count', () => {
    const output = formatFailure([
      stableEntry('/api/old'),
      {
        ...stableEntry(
          '/api/cases/{caseId}/user_actions/_find',
          'added a variant to payload oneOf'
        ),
        method: 'get',
        oasdiffId: 'response-property-one-of-added',
        reportOnly: true,
        policyReason: 'Adding a variant to a response oneOf is additive.',
      },
    ]);

    expectOutputContains(
      output,
      // count reflects only the gating change, even though both are stable tier
      'Detected 1 breaking change(s) in stable/tech_preview APIs (1 stable, 0 tech_preview)',
      'Kibana treats as additive',
      '/api/cases/{caseId}/user_actions/_find',
      'Why this does not block: Adding a variant to a response oneOf is additive.'
    );
  });

  it('omits the report-only section when no rule was demoted', () => {
    expect(formatFailure([stableEntry('/api/old')])).not.toContain('Kibana treats as additive');
  });

  describe('when nothing gates', () => {
    const reportOnlyEntry: ImpactReportEntry = {
      ...stableEntry('/api/cases/{caseId}/user_actions/_find', 'added a variant to payload oneOf'),
      oasdiffId: 'response-property-one-of-added',
      reportOnly: true,
      policyReason: 'Adding a variant to a response oneOf is additive.',
    };

    it.each([
      ['report-only', [reportOnlyEntry]],
      ['experimental', [experimentalEntry('/api/exp')]],
    ])('lists %s changes without a failure header or allowlist prompt', (_, entries) => {
      const output = formatFailure(entries);

      expectOutputContains(
        output,
        'API CONTRACT CHANGES REPORTED',
        'No breaking changes detected in stable/tech_preview APIs',
        'Nothing here blocks merge. Optional: release note describing the change in the PR description',
        `for tier definitions and the rule policy: ${README_LINK}`,
        entries[0].path
      );
      expect(output.match(/release note/gi)).toHaveLength(1);
      expect(output).not.toContain('release_note:breaking');
      expect(output).not.toContain('BREAKING CHANGES DETECTED');
      expect(output).not.toContain('Detected 0 breaking change(s)');
      expect(output).not.toContain('What to do next:');
      expect(output).not.toContain('allowlist');
    });

    it('prints the policy reason for a report-only change', () => {
      expectOutputContains(
        formatFailure([reportOnlyEntry]),
        'Why this does not block: Adding a variant to a response oneOf is additive.'
      );
    });
  });

  it('produces deterministic output for the same input', () => {
    const entries = [stableEntry('/api/test')];

    expect(formatFailure(entries)).toEqual(formatFailure(entries));
  });

  it('ends with the README link instead of an escalation link', () => {
    const output = formatFailure([stableEntry('/api/test')]);

    expectOutputContains(output, `for tier definitions and the allowlist workflow: ${README_LINK}`);
    expect(output).not.toContain('Need help?');
    expect(output).not.toContain('issues/new');
  });

  it('asks for the release_note:breaking label and a release note when a change gates', () => {
    const output = formatFailure([stableEntry('/api/test')]);

    expectOutputContains(
      output,
      '3. If intentional:\n' +
        '   - add an approved allowlist entry and coordinate with the owning team\n' +
        '   - add the `release_note:breaking` PR label (replacing any other `release_note:*` label)\n' +
        '   - add release note text to the PR description, see Release note below\n',
      "Release note:\n\nAdd a `## Release note` section to the PR description. The release notes script publishes that text as this change's entry in the Breaking changes section of the Kibana release notes, so write it for API users: what changed, how it affects them, and what they need to do."
    );
    expect(output).not.toContain('Optional: release note');
  });

  it('keeps each prose sentence on one line', () => {
    const output = formatFailure([
      stableEntry('/api/old'),
      experimentalEntry('/api/exp'),
      { ...stableEntry('/api/add'), reportOnly: true, policyReason: 'Additive.' },
    ]);

    expectOutputContains(
      output,
      'The following breaking change(s) are in experimental APIs, which are allowed to break. They are listed for visibility only and do not fail this check.',
      'The following change(s) match oasdiff rules Kibana treats as additive, so they do not fail this check.\n'
    );
    expect(output).not.toContain('worth adding');
  });
});
