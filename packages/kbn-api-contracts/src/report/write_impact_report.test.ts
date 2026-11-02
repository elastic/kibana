/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync, rmSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { writeImpactReport } from './write_impact_report';
import type { ImpactReport } from './write_impact_report';

describe('writeImpactReport', () => {
  const testDir = resolve(__dirname, '__test_fixtures__', 'write_impact_report');
  const reportPath = resolve(testDir, 'nested', 'report.json');

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates parent directories and writes the report verbatim', () => {
    const report: ImpactReport = {
      entries: [
        {
          path: '/api/x',
          method: 'POST',
          reason: 'Endpoint removed',
          tier: 'stable',
        },
      ],
    };

    writeImpactReport(reportPath, report);

    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, 'utf-8'))).toEqual(report);
  });

  it('writes an empty entries array when there are no detected changes', () => {
    mkdirSync(resolve(reportPath, '..'), { recursive: true });

    writeImpactReport(reportPath, { entries: [] });

    const written = JSON.parse(readFileSync(reportPath, 'utf-8'));
    expect(written.entries).toEqual([]);
  });

  it('preserves the optional "since" field', () => {
    const report: ImpactReport = {
      entries: [
        {
          path: '/api/fleet/agent_policies',
          method: 'POST',
          reason: 'HTTP method removed',
          tier: 'tech_preview',
          since: '9.1',
        },
      ],
    };

    writeImpactReport(reportPath, report);

    const written = JSON.parse(readFileSync(reportPath, 'utf-8'));
    expect(written.entries[0]).toEqual(report.entries[0]);
  });
});
