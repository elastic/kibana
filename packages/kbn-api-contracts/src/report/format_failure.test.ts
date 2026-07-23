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

const expectOutputContains = (output: string, ...substrings: string[]) => {
  substrings.forEach((substring) => {
    expect(output).toContain(substring);
  });
};

const expectOutputNotContains = (output: string, ...substrings: string[]) => {
  substrings.forEach((substring) => {
    expect(output).not.toContain(substring);
  });
};

describe('formatFailure', () => {
  it('formats a single caught change with its tier', () => {
    const output = formatFailure([stableEntry('/api/test')]);

    expectOutputContains(
      output,
      'API CONTRACT BREAKING CHANGES CAUGHT',
      'Caught 1 breaking change(s) in stable/tech_preview APIs (1 stable, 0 tech_preview)',
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
      'Caught 2 breaking change(s) in stable/tech_preview APIs (1 stable, 1 tech_preview)',
      'Tier: Stable (GA)',
      'Tier: Technical Preview',
      'Method: DELETE'
    );
    // stable ordered first regardless of input order
    expect(output.indexOf('/api/old')).toBeLessThan(output.indexOf('/api/preview'));
  });

  it('flags a change that also affects a Terraform provider API', () => {
    const output = formatFailure([
      {
        path: '/api/spaces/space',
        reason: 'Endpoint removed',
        tier: 'stable',
        terraformResource: 'elasticstack_kibana_space',
        owners: ['@elastic/kibana-security'],
      },
    ]);

    expectOutputContains(
      output,
      'elasticstack_kibana_space',
      'also affects the Terraform provider',
      'Owners: @elastic/kibana-security'
    );
  });

  it('omits Terraform details when the change maps to no provider API', () => {
    const output = formatFailure([stableEntry('/api/test')]);

    expectOutputNotContains(output, 'Terraform Resource', 'also affects the Terraform provider');
  });

  it('produces deterministic output for the same input', () => {
    const entries = [stableEntry('/api/test')];

    expect(formatFailure(entries)).toEqual(formatFailure(entries));
  });

  it('includes the help link', () => {
    expectOutputContains(formatFailure([stableEntry('/api/test')]), 'Need help?');
  });
});
