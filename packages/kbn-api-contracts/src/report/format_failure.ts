/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ImpactReportEntry, CaughtTier } from './write_impact_report';
import { ESCALATION_LINK } from './links';

const HEADER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                     API CONTRACT BREAKING CHANGES CAUGHT                   ║
╚════════════════════════════════════════════════════════════════════════════╝

`.split('\n');

const FOOTER = `
────────────────────────────────────────────────────────────────────────────

What to do next:

1. Review the breaking changes above
2. If unintentional, revert the change
3. If intentional, add an approved allowlist entry and coordinate with the owning team

Need help? ${ESCALATION_LINK}

`.split('\n');

const TIER_LABEL: Record<CaughtTier, string> = {
  stable: 'Stable (GA)',
  tech_preview: 'Technical Preview',
};

const formatEntry = (entry: ImpactReportEntry, idx: number): string[] => {
  const lines = [
    `${idx + 1}. ${entry.reason}`,
    `   Path: ${entry.path}`,
    `   Tier: ${TIER_LABEL[entry.tier]}`,
  ];

  if (entry.method) {
    lines.push(`   Method: ${entry.method.toUpperCase()}`);
  }

  if (entry.terraformResource) {
    lines.push(
      `   Terraform Resource: ${entry.terraformResource} (also affects the Terraform provider)`
    );
  }

  if (entry.owners && entry.owners.length > 0) {
    lines.push(`   Owners: ${entry.owners.join(', ')}`);
  }

  return [...lines, ''];
};

/**
 * Format the CI-log summary for caught breaking changes, ordered by tier
 * (stable first, then tech_preview) and flagging any change that also affects a
 * Terraform provider API. Entries are already tier-classified and enriched by
 * check_contracts, so this is presentation only.
 */
export function formatFailure(entries: ImpactReportEntry[]): string {
  const stable = entries.filter((e) => e.tier === 'stable');
  const techPreview = entries.filter((e) => e.tier === 'tech_preview');
  const ordered = [...stable, ...techPreview];

  return [
    ...HEADER,
    `Caught ${entries.length} breaking change(s) in stable/tech_preview APIs ` +
      `(${stable.length} stable, ${techPreview.length} tech_preview):`,
    '',
    ...ordered.flatMap(formatEntry),
    ...FOOTER,
  ].join('\n');
}
