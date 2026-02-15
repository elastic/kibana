/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatFailure } from './format_failure';
import type { BreakingChange } from '../diff/breaking_rules';
import type { TerraformImpactResult } from '../terraform/check_terraform_impact';

const pathRemovedBreaking = (path: string, reason = 'Endpoint removed'): BreakingChange => ({
  type: 'path_removed',
  path,
  reason,
});

const methodRemovedBreaking = (
  path: string,
  method: string,
  reason = 'HTTP method removed'
): BreakingChange => ({ type: 'method_removed', path, method, reason });

const operationBreaking = (
  path: string,
  method: string,
  reason: string,
  details?: unknown
): BreakingChange => ({ type: 'operation_breaking', path, method, reason, details });

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
  it('formats a single breaking change', () => {
    const changes = [pathRemovedBreaking('/api/test')];
    const output = formatFailure(changes);

    expectOutputContains(
      output,
      'API CONTRACT BREAKING CHANGES DETECTED',
      'Found 1 breaking change(s)',
      '1. Endpoint removed',
      'Path: /api/test',
      'What to do next:'
    );
  });

  it('formats multiple breaking changes', () => {
    const changes = [
      pathRemovedBreaking('/api/old'),
      methodRemovedBreaking('/api/test', 'delete'),
      operationBreaking('/api/test', 'post', 'requestBody modified', { content: {} }),
    ];
    const output = formatFailure(changes);

    expectOutputContains(
      output,
      'Found 3 breaking change(s)',
      '1. Endpoint removed',
      '2. HTTP method removed',
      '3. requestBody modified',
      'Method: DELETE',
      'Method: POST'
    );
  });

  it('includes details when present', () => {
    const changes = [
      operationBreaking('/api/test', 'get', 'responses modified', {
        '200': { description: 'Success' },
      }),
    ];
    const output = formatFailure(changes);

    expectOutputContains(output, 'Details:', '"200"', '"description": "Success"');
  });

  it('produces deterministic output for same input', () => {
    const changes = [pathRemovedBreaking('/api/test')];

    const output1 = formatFailure(changes);
    const output2 = formatFailure(changes);

    expect(output1).toEqual(output2);
  });

  it('includes help links', () => {
    const changes = [pathRemovedBreaking('/api/test')];
    const output = formatFailure(changes);

    expectOutputContains(output, 'Need help?');
  });

  describe('terraform impact', () => {
    it('does not show terraform section when no impact', () => {
      const changes = [pathRemovedBreaking('/api/test')];
      const terraformImpact: TerraformImpactResult = {
        hasImpact: false,
        impactedChanges: [],
      };
      const output = formatFailure(changes, terraformImpact);

      expectOutputNotContains(output, 'TERRAFORM PROVIDER IMPACT');
    });

    it('shows terraform section when there is impact', () => {
      const changes = [pathRemovedBreaking('/api/spaces/space')];
      const terraformImpact: TerraformImpactResult = {
        hasImpact: true,
        impactedChanges: [{ change: changes[0], terraformResource: 'elasticstack_kibana_space' }],
      };
      const output = formatFailure(changes, terraformImpact);

      expectOutputContains(
        output,
        'TERRAFORM PROVIDER IMPACT',
        'elasticstack_kibana_space',
        '/api/spaces/space',
        'Coordinate with @elastic/terraform-provider'
      );
    });

    it('shows multiple terraform impacts', () => {
      const changes = [
        pathRemovedBreaking('/api/spaces/space'),
        methodRemovedBreaking('/api/fleet/agent_policies', 'POST'),
      ];
      const terraformImpact: TerraformImpactResult = {
        hasImpact: true,
        impactedChanges: [
          { change: changes[0], terraformResource: 'elasticstack_kibana_space' },
          { change: changes[1], terraformResource: 'elasticstack_fleet_agent_policy' },
        ],
      };
      const output = formatFailure(changes, terraformImpact);

      expectOutputContains(output, 'elasticstack_kibana_space', 'elasticstack_fleet_agent_policy');
    });
  });
});
