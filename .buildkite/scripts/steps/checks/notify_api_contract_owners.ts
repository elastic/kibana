/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync } from 'fs';
import { upsertComment } from '#pipeline-utils';

type CaughtTier = 'stable' | 'tech_preview';

export interface ImpactEntry {
  path: string;
  method?: string;
  reason: string;
  oasdiffId?: string;
  source?: string;
  tier: CaughtTier;
  since?: string;
  terraformResource?: string;
  owners?: string[];
}

interface ImpactReport {
  entries: ImpactEntry[];
}

// Legacy context id, kept so an existing comment on an in-flight PR is updated in
// place rather than duplicated when this check moves to whole-surface detection.
const COMMENT_CONTEXT = 'api-contracts-tf-breaking';

const ALLOWLIST_PATH = 'packages/kbn-api-contracts/allowlist.json';
const README_PATH = 'packages/kbn-api-contracts/README.md';

const TIER_LABEL: Record<CaughtTier, string> = {
  stable: 'Stable (GA)',
  tech_preview: 'Technical Preview',
};

const escapeCell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const renderTierSection = (tier: CaughtTier, entries: ImpactEntry[]): string => {
  if (entries.length === 0) {
    return '';
  }
  const rows = entries
    .map((e) => {
      const method = e.method ? ` \`${e.method.toUpperCase()}\`` : '';
      const oasdiffId = e.oasdiffId ? `\`${escapeCell(e.oasdiffId)}\`` : '';
      const source = e.source ? `\`${escapeCell(e.source)}\`` : '';
      const terraform = e.terraformResource ? `\`${escapeCell(e.terraformResource)}\`` : '';
      const owners = (e.owners || []).join(', ');
      return `| \`${e.path}\`${method} | ${escapeCell(
        e.reason
      )} | ${oasdiffId} | ${source} | ${terraform} | ${owners} |`;
    })
    .join('\n');

  return `### ${TIER_LABEL[tier]} (${entries.length})

| Endpoint | Reason | oasdiffId | Source | Terraform Resource | Owners |
|----------|--------|-----------|--------|--------------------|--------|
${rows}
`;
};

export const buildCommentBody = (entries: ImpactEntry[]): string => {
  const allOwners = [...new Set(entries.flatMap((e) => e.owners || []))];
  const ownerMentions = allOwners.length > 0 ? allOwners.join(' ') : '_unknown_';

  const sections = [
    renderTierSection(
      'stable',
      entries.filter((e) => e.tier === 'stable')
    ),
    renderTierSection(
      'tech_preview',
      entries.filter((e) => e.tier === 'tech_preview')
    ),
  ]
    .filter(Boolean)
    .join('\n');

  return `## API Contract Breaking Changes — Stable & Technical Preview

cc ${ownerMentions}

The following breaking change(s) were detected across the stable and Technical Preview OpenAPI surface, grouped by stability tier. Rows with a Terraform Resource also affect the [Elastic Terraform Provider](https://github.com/elastic/terraform-provider-elasticstack).

${sections}
### What to do

1. **Fix the breaking change** if it was unintentional, then regenerate the OAS with \`node scripts/capture_oas_snapshot --update\`.
2. **If intentional**, add an approved entry to [\`${ALLOWLIST_PATH}\`](https://github.com/elastic/kibana/blob/main/${ALLOWLIST_PATH}) and coordinate with the owning team. Use the \`oasdiffId\` and \`source\` values from the table above to [scope the allowlist entry](https://github.com/elastic/kibana/blob/main/${README_PATH}#granular-suppression) to this specific change.

See the [\`@kbn/api-contracts\` README](https://github.com/elastic/kibana/blob/main/${README_PATH}) for tier definitions and the allowlist workflow.`;
};

const isImpactReport = (report: unknown): report is ImpactReport =>
  typeof report === 'object' &&
  report !== null &&
  Array.isArray((report as { entries?: unknown }).entries);

// The same change appearing in both the stack and serverless specs collapses to
// one row, keyed by endpoint + change identity.
const dedupeByChange = (entries: ImpactEntry[]): ImpactEntry[] =>
  Array.from(
    new Map(
      entries.map((e) => [
        `${e.path}::${e.method ?? ''}::${e.oasdiffId ?? ''}::${e.source ?? ''}`,
        e,
      ])
    ).values()
  );

async function main() {
  const reportPaths = process.argv.slice(2);

  const entries: ImpactEntry[] = [];

  for (const reportPath of reportPaths) {
    if (!existsSync(reportPath)) {
      continue;
    }
    let report: unknown;
    try {
      report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    } catch {
      console.error(`Failed to parse report at ${reportPath}, skipping`);
      continue;
    }
    if (isImpactReport(report)) {
      entries.push(...report.entries);
    } else {
      console.error(`Report at ${reportPath} has no recognized shape, skipping`);
    }
  }

  if (entries.length === 0) {
    console.log('No breaking changes to report');
    return;
  }

  console.log('Posting PR comment notifying API owners...');

  await upsertComment({
    commentBody: buildCommentBody(dedupeByChange(entries)),
    commentContext: COMMENT_CONTEXT,
    clearPrevious: true,
  });

  console.log('PR comment posted successfully');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to post API contract notification:', error);
    process.exit(1);
  });
}
