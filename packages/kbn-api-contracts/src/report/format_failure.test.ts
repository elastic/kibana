/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatFailure } from './format_failure';
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

  it('produces deterministic output for the same input', () => {
    const entries = [stableEntry('/api/test')];

    expect(formatFailure(entries)).toEqual(formatFailure(entries));
  });

  it('includes the help link', () => {
    expectOutputContains(formatFailure([stableEntry('/api/test')]), 'Need help?');
  });
});
