/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from '../diff/breaking_rules';
import type { TerraformImpactResult } from '../terraform/check_terraform_impact';
import { DOCS_LINK, ESCALATION_LINK } from './links';

export function formatFailure(
  breakingChanges: BreakingChange[],
  terraformImpact?: TerraformImpactResult
): string {
  const lines: string[] = [];

  lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║                     API CONTRACT BREAKING CHANGES DETECTED                 ║');
  lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`Found ${breakingChanges.length} breaking change(s):`);
  lines.push('');

  breakingChanges.forEach((change, idx) => {
    lines.push(`${idx + 1}. ${change.reason}`);
    lines.push(`   Path: ${change.path}`);
    if (change.method) {
      lines.push(`   Method: ${change.method.toUpperCase()}`);
    }
    if (change.details) {
      lines.push(
        `   Details: ${JSON.stringify(change.details, null, 2).split('\n').join('\n   ')}`
      );
    }
    lines.push('');
  });

  if (terraformImpact?.hasImpact) {
    lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        TERRAFORM PROVIDER IMPACT                           ║');
    lines.push('╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push('⚠️  The following breaking changes affect Terraform Provider APIs:');
    lines.push('');

    terraformImpact.impactedChanges.forEach((impact) => {
      const method = impact.change.method ? ` ${impact.change.method.toUpperCase()}` : '';
      lines.push(`• ${impact.change.path}${method}`);
      lines.push(`  Terraform Resource: ${impact.terraformResource}`);
      lines.push(`  Reason: ${impact.change.reason}`);
      lines.push('');
    });

    lines.push('Coordinate with @elastic/terraform-provider before merging.');
    lines.push('');
  }

  lines.push('────────────────────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('What to do next:');
  lines.push('');
  lines.push('1. Review the breaking changes above');
  lines.push('2. If intentional, update the baseline after approval');
  lines.push('3. If unintentional, revert the changes');
  lines.push('');
  lines.push(`Documentation: ${DOCS_LINK}`);
  lines.push(`Need help? ${ESCALATION_LINK}`);
  lines.push('');

  return lines.join('\n');
}
