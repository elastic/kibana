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

export interface ImpactEntry {
  path: string;
  method?: string;
  reason: string;
  oasdiffId?: string;
  source?: string;
  terraformResource: string;
  owners: string[];
}

interface ImpactReport {
  impactedChanges: ImpactEntry[];
}

const COMMENT_CONTEXT = 'api-contracts-tf-breaking';

const ALLOWLIST_PATH = 'packages/kbn-api-contracts/allowlist.json';
const README_PATH = 'packages/kbn-api-contracts/README.md';

export const buildCommentBody = (entries: ImpactEntry[]): string => {
  const allOwners = [...new Set(entries.flatMap((e) => e.owners || []))];
  const ownerMentions = allOwners.length > 0 ? allOwners.join(' ') : '_unknown_';

  const escapeCell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

  const rows = entries
    .map((e) => {
      const method = e.method ? ` \`${e.method.toUpperCase()}\`` : '';
      const oasdiffId = e.oasdiffId ? `\`${escapeCell(e.oasdiffId)}\`` : '';
      const source = e.source ? `\`${escapeCell(e.source)}\`` : '';
      return `| \`${e.path}\`${method} | ${escapeCell(e.terraformResource)} | ${escapeCell(
        e.reason
      )} | ${oasdiffId} | ${source} | ${(e.owners || []).join(', ')} |`;
    })
    .join('\n');

  return `## API Contract Breaking Changes — Terraform Provider Impact

cc ${ownerMentions}

The following breaking change(s) affect APIs consumed by the [Elastic Terraform Provider](https://github.com/elastic/terraform-provider-elasticstack).

| Endpoint | Terraform Resource | Reason | oasdiffId | Source | Owners |
|----------|--------------------|--------|-----------|--------|--------|
${rows}

### What to do

1. **Fix the breaking change** if it was unintentional.
2. **If intentional**, add an approved entry to [\`${ALLOWLIST_PATH}\`](https://github.com/elastic/kibana/blob/main/${ALLOWLIST_PATH}) and coordinate with members in the \`#kibana-oas-terraform\` Slack channel. Use the \`oasdiffId\` and \`source\` values from the table above to [scope the allowlist entry](https://github.com/elastic/kibana/blob/main/${README_PATH}#granular-suppression) to this specific change.

See the [\`@kbn/api-contracts\` README](https://github.com/elastic/kibana/blob/main/${README_PATH}) for details on the allowlist schema and workflow.`;
};

async function main() {
  const reportPaths = process.argv.slice(2);

  const allEntries: ImpactEntry[] = [];
  for (const reportPath of reportPaths) {
    if (!existsSync(reportPath)) {
      continue;
    }
    try {
      const report: ImpactReport = JSON.parse(readFileSync(reportPath, 'utf-8'));
      if (!Array.isArray(report.impactedChanges)) {
        console.error(`Report at ${reportPath} has no impactedChanges array, skipping`);
        continue;
      }
      allEntries.push(...report.impactedChanges);
    } catch {
      console.error(`Failed to parse report at ${reportPath}, skipping`);
    }
  }

  if (allEntries.length === 0) {
    console.log('No TF-impacting breaking changes to report');
    return;
  }

  const deduped = Array.from(
    new Map(
      allEntries.map((e) => [
        `${e.path}::${e.method ?? ''}::${e.oasdiffId ?? ''}::${e.source ?? ''}`,
        e,
      ])
    ).values()
  );

  const body = buildCommentBody(deduped);
  console.log('Posting PR comment notifying API owners...');

  await upsertComment({
    commentBody: body,
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
