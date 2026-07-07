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
import type { TerraformImpactResult } from '../terraform/check_terraform_impact';

describe('writeImpactReport', () => {
  const testDir = resolve(__dirname, '__test_fixtures__', 'write_impact_report');
  const reportPath = resolve(testDir, 'nested', 'report.json');

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates parent directories and writes a valid JSON report', () => {
    const impact: TerraformImpactResult = {
      hasImpact: true,
      impactedChanges: [
        {
          change: {
            type: 'path_removed',
            path: '/api/spaces/space',
            reason: 'Endpoint removed',
          },
          terraformResource: 'elasticstack_kibana_space',
          owners: ['@elastic/kibana-security'],
        },
      ],
    };

    writeImpactReport(reportPath, impact);

    expect(existsSync(reportPath)).toBe(true);
    const written = JSON.parse(readFileSync(reportPath, 'utf-8'));
    expect(written.impactedChanges).toHaveLength(1);
    expect(written.impactedChanges[0]).toEqual({
      path: '/api/spaces/space',
      method: undefined,
      reason: 'Endpoint removed',
      terraformResource: 'elasticstack_kibana_space',
      owners: ['@elastic/kibana-security'],
    });
  });

  it('writes an empty array when there are no impacted changes', () => {
    mkdirSync(resolve(reportPath, '..'), { recursive: true });

    const impact: TerraformImpactResult = {
      hasImpact: false,
      impactedChanges: [],
    };

    writeImpactReport(reportPath, impact);

    const written = JSON.parse(readFileSync(reportPath, 'utf-8'));
    expect(written.impactedChanges).toEqual([]);
  });

  it('includes the method field when present on the change', () => {
    const impact: TerraformImpactResult = {
      hasImpact: true,
      impactedChanges: [
        {
          change: {
            type: 'method_removed',
            path: '/api/fleet/agent_policies',
            method: 'POST',
            reason: 'HTTP method removed',
          },
          terraformResource: 'elasticstack_fleet_agent_policy',
          owners: ['@elastic/fleet'],
        },
      ],
    };

    writeImpactReport(reportPath, impact);

    const written = JSON.parse(readFileSync(reportPath, 'utf-8'));
    expect(written.impactedChanges[0].method).toBe('POST');
  });
});
