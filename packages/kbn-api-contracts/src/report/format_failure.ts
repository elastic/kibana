/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from '../diff/breaking_rules';
import type { TerraformImpactResult, TerraformImpact } from '../terraform/check_terraform_impact';
import { ESCALATION_LINK } from './links';

const HEADER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                     API CONTRACT BREAKING CHANGES DETECTED                 ║
╚════════════════════════════════════════════════════════════════════════════╝

`.split('\n');

const TERRAFORM_HEADER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                        TERRAFORM PROVIDER IMPACT                           ║
╚════════════════════════════════════════════════════════════════════════════╝

⚠️  The following breaking changes affect Terraform Provider APIs:

`.split('\n');

const FOOTER = `
────────────────────────────────────────────────────────────────────────────

What to do next:

1. Review the breaking changes above
2. If intentional, add an allowlist entry with approval
3. If unintentional, revert the changes

Need help? ${ESCALATION_LINK}

`.split('\n');
const formatBreakingChange = (change: BreakingChange, idx: number): string[] => {
  const lines = [`${idx + 1}. ${change.reason}`, `   Path: ${change.path}`];

  if (change.method) {
    lines.push(`   Method: ${change.method.toUpperCase()}`);
  }

  if (change.details) {
    lines.push(`   Details: ${JSON.stringify(change.details, null, 2).split('\n').join('\n   ')}`);
  }

  return [...lines, ''];
};

const formatTerraformImpact = (impact: TerraformImpact): string[] => {
  const method = impact.change.method ? ` ${impact.change.method.toUpperCase()}` : '';
  return [
    `• ${impact.change.path}${method}`,
    `  Terraform Resource: ${impact.terraformResource}`,
    `  Reason: ${impact.change.reason}`,
    '',
  ];
};

export function formatFailure(
  breakingChanges: BreakingChange[],
  terraformImpact?: TerraformImpactResult
): string {
  const breakingSection = breakingChanges.flatMap(formatBreakingChange);

  const terraformSection = terraformImpact?.hasImpact
    ? [
        ...TERRAFORM_HEADER,
        ...terraformImpact.impactedChanges.flatMap(formatTerraformImpact),
        'Coordinate with @elastic/terraform-provider before merging.',
        '',
      ]
    : [];

  return [
    ...HEADER,
    `Found ${breakingChanges.length} breaking change(s):`,
    '',
    ...breakingSection,
    ...terraformSection,
    ...FOOTER,
  ].join('\n');
}
