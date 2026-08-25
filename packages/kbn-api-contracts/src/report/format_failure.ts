/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StabilityTier } from '../stability';
import type { ImpactReportEntry } from './write_impact_report';
import { ESCALATION_LINK } from './links';

const HEADER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                     API CONTRACT BREAKING CHANGES DETECTED                 ║
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

const TIER_LABEL: Record<StabilityTier, string> = {
  stable: 'Stable (GA)',
  tech_preview: 'Technical Preview',
  experimental: 'Experimental',
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

  return [...lines, ''];
};

const EXPERIMENTAL_HEADING = `
────────────────────────────────────────────────────────────────────────────

Informational — not blocking merge:

The following breaking change(s) are in experimental APIs, which are allowed to
break. They are listed for visibility only and do not fail this check.

`.split('\n');

/**
 * Format the CI-log summary for detected breaking changes. Gating tiers (stable
 * first, then tech_preview) lead the report and drive the summary count;
 * experimental changes, if any, follow in a clearly non-blocking section. Entries
 * are already tier-classified by check_contracts, so this is presentation only.
 */
export function formatFailure(entries: ImpactReportEntry[]): string {
  const stable = entries.filter((e) => e.tier === 'stable');
  const techPreview = entries.filter((e) => e.tier === 'tech_preview');
  const experimental = entries.filter((e) => e.tier === 'experimental');
  const gating = [...stable, ...techPreview];

  const experimentalSection =
    experimental.length > 0 ? [...EXPERIMENTAL_HEADING, ...experimental.flatMap(formatEntry)] : [];

  return [
    ...HEADER,
    `Detected ${gating.length} breaking change(s) in stable/tech_preview APIs ` +
      `(${stable.length} stable, ${techPreview.length} tech_preview):`,
    '',
    ...gating.flatMap(formatEntry),
    ...experimentalSection,
    ...FOOTER,
  ].join('\n');
}
