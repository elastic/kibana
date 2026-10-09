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

// Mirrors StabilityTier in @kbn/api-contracts. Kept as a local type because the
// notifier only reads the JSON report
type Tier = 'stable' | 'tech_preview' | 'experimental';

export interface ImpactEntry {
  path: string;
  method?: string;
  reason: string;
  oasdiffId?: string;
  source?: string;
  tier: Tier;
  since?: string;
}

interface ImpactReport {
  entries: ImpactEntry[];
}

// Kept stable so CI reruns on in-flight PRs update the existing comment in place
// rather than posting a duplicate alongside the old one.
const COMMENT_CONTEXT = 'api-contracts-breaking';

const ALLOWLIST_PATH = 'packages/kbn-api-contracts/allowlist.json';
const README_PATH = 'packages/kbn-api-contracts/README.md';

const TIER_LABEL: Record<Tier, string> = {
  stable: 'Stable (GA)',
  tech_preview: 'Technical Preview',
  experimental: 'Experimental',
};

const escapeCell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const renderTable = (entries: ImpactEntry[]): string => {
  const rows = entries
    .map((e) => {
      const method = e.method ? ` \`${e.method.toUpperCase()}\`` : '';
      const oasdiffId = e.oasdiffId ? `\`${escapeCell(e.oasdiffId)}\`` : '';
      const source = e.source ? `\`${escapeCell(e.source)}\`` : '';
      return `| \`${e.path}\`${method} | ${escapeCell(e.reason)} | ${oasdiffId} | ${source} |`;
    })
    .join('\n');

  return `| Endpoint | Reason | oasdiffId | Source |
|----------|--------|-----------|--------|
${rows}`;
};

const renderTierSection = (tier: Tier, entries: ImpactEntry[]): string => {
  if (entries.length === 0) {
    return '';
  }
  return `### ${TIER_LABEL[tier]} (${entries.length})

${renderTable(entries)}
`;
};

const renderExperimentalSection = (entries: ImpactEntry[]): string => {
  if (entries.length === 0) {
    return '';
  }
  return `### Experimental — informational, not blocking merge (${entries.length})

Experimental APIs are allowed to introduce breaking changes. These are listed for visibility only and do not fail this check.

${renderTable(entries)}
`;
};

export const buildCommentBody = (entries: ImpactEntry[]): string => {
  const gatingSections = [
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

  const experimentalSection = renderExperimentalSection(
    entries.filter((e) => e.tier === 'experimental')
  );

  const sections = [gatingSections, experimentalSection].filter(Boolean).join('\n');

  return `## API Contract Breaking Changes

The following breaking change(s) were detected across the public OpenAPI surface, grouped by stability tier. Stable and Technical Preview changes fail the check and should be resolved; Experimental changes are informational.

${sections}
### What to do

1. **Fix the breaking change** if it was unintentional.
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
