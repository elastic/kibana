/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync } from 'fs';
import { basename, resolve } from 'node:path';
import { getKibanaDir } from '../../../pipeline-utils/get_kibana_dir.ts';
import { KIBANA_COMMENT_SIGIL, upsertComment } from '#pipeline-utils';

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
  reportOnly?: boolean;
  policyReason?: string;
  allowlisted?: boolean;
}

interface ImpactReport {
  entries: ImpactEntry[];
}

// Kept stable so CI reruns on in-flight PRs update the existing comment in place
// rather than posting a duplicate alongside the old one.
const COMMENT_CONTEXT = 'api-contracts-breaking';

// upsertComment prepends this marker. GitHub rejects the combined body past the limit.
const COMMENT_MARKER = `<!-- ${KIBANA_COMMENT_SIGIL}:${COMMENT_CONTEXT} -->\n`;

export const GITHUB_COMMENT_MAX_LENGTH = 65_536;

export const postedCommentLength = (commentBody: string): number =>
  COMMENT_MARKER.length + commentBody.length;

const ALLOWLIST_PATH = 'packages/kbn-api-contracts/allowlist.json';
const README_PATH = 'packages/kbn-api-contracts/README.md';
const RELEASE_NOTE_COPY_PATH = 'packages/kbn-api-contracts/src/report/release_note.json';

interface ReleaseNoteCopy {
  labelStep: string;
  textStep: string;
  guidance: string;
  optionalPrompt: string;
}

// Shared with the CI log. Read from the checkout; this step does not load the package.
const releaseNote = JSON.parse(
  readFileSync(resolve(getKibanaDir(), RELEASE_NOTE_COPY_PATH), 'utf8')
) as ReleaseNoteCopy;

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

const renderReportOnlySection = (entries: ImpactEntry[]): string => {
  if (entries.length === 0) {
    return '';
  }
  const reasons = [...new Set(entries.map((e) => e.policyReason).filter(Boolean))]
    .map((reason) => `- ${reason}`)
    .join('\n');

  return `### Reported only — not blocking merge (${entries.length})

These match oasdiff rules Kibana treats as additive, so they do not fail this check.

${reasons ? `${reasons}\n\n` : ''}${renderTable(entries)}
`;
};

const renderAllowlistedSection = (entries: ImpactEntry[]): string => {
  if (entries.length === 0) {
    return '';
  }
  return `### Approved — not blocking merge (${entries.length})

These Stable or Technical Preview changes match an approved allowlist entry, so they do not fail this check. They still ship as breaking changes.

${renderTable(entries)}
`;
};

// Lower rank is kept when the comment has to be shortened.
const TRUNCATION_RANK = {
  stable: 0,
  tech_preview: 1,
  allowlisted: 2,
  experimental: 3,
  reportOnly: 4,
} as const;

const truncationRank = (entry: ImpactEntry): number => {
  if (entry.allowlisted) {
    return TRUNCATION_RANK.allowlisted;
  }
  if (entry.reportOnly) {
    return TRUNCATION_RANK.reportOnly;
  }
  return TRUNCATION_RANK[entry.tier];
};

const orderEntriesForTruncation = (entries: ImpactEntry[]): ImpactEntry[] =>
  entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => truncationRank(a.entry) - truncationRank(b.entry) || a.index - b.index)
    .map(({ entry }) => entry);

const truncationNote = (shown: number, total: number): string =>
  `> [!NOTE]\n> Showing ${shown} of ${total} change(s). The rest are only in the API contracts CI log.`;

const renderComment = (allEntries: ImpactEntry[], shownEntries: ImpactEntry[]): string => {
  const allowlisted = shownEntries.filter((e) => e.allowlisted);
  const entries = shownEntries.filter((e) => !e.allowlisted);
  const gating = entries.filter((e) => !e.reportOnly);

  const gatingSections = [
    renderTierSection(
      'stable',
      gating.filter((e) => e.tier === 'stable')
    ),
    renderTierSection(
      'tech_preview',
      gating.filter((e) => e.tier === 'tech_preview')
    ),
  ]
    .filter(Boolean)
    .join('\n');

  const experimentalSection = renderExperimentalSection(
    gating.filter((e) => e.tier === 'experimental')
  );

  const reportOnlySection = renderReportOnlySection(entries.filter((e) => e.reportOnly));

  const allowlistedSection = renderAllowlistedSection(allowlisted);

  const sections = [gatingSections, allowlistedSection, experimentalSection, reportOnlySection]
    .filter(Boolean)
    .join('\n');

  const omitted = allEntries.length - shownEntries.length;
  const noteBlock =
    omitted > 0 ? `${truncationNote(shownEntries.length, allEntries.length)}\n\n` : '';

  // The variant follows the full report. Dropping rows to fit the comment must
  // not turn a gating result into the informational footer.
  const hasGating = allEntries.some(
    (entry) => !entry.allowlisted && !entry.reportOnly && entry.tier !== 'experimental'
  );
  const hasAllowlisted = allEntries.some((entry) => entry.allowlisted);

  if (!hasGating && hasAllowlisted) {
    return `## API Contract Breaking Changes

The Stable or Technical Preview breaking change(s) below are approved in the allowlist, so they do not fail this check. They still ship as breaking changes and need a release note.

${sections}
${noteBlock}### What to do

Nothing here blocks merge. The approved breaking change(s) still ship with this PR, so:

- ${releaseNote.labelStep}.
- ${releaseNote.textStep}.

### Release note

${releaseNote.guidance}

See the [\`@kbn/api-contracts\` README](https://github.com/elastic/kibana/blob/main/${README_PATH}) for tier definitions and the allowlist workflow.`;
  }

  if (!hasGating) {
    return `## API Contract Breaking Changes

No stable or Technical Preview breaking changes were detected. The change(s) below are informational and do not fail this check.

${sections}
${noteBlock}### What to do

Nothing here blocks merge. ${releaseNote.optionalPrompt}

See the [\`@kbn/api-contracts\` README](https://github.com/elastic/kibana/blob/main/${README_PATH}) for tier definitions and the rule policy.`;
  }

  return `## API Contract Breaking Changes

The following breaking change(s) were detected across the public OpenAPI surface, grouped by stability tier. Stable and Technical Preview changes fail the check and should be resolved; Experimental and reported-only changes are informational.

${sections}
${noteBlock}### What to do

1. **Fix the breaking change** if it was unintentional.
2. **If intentional**:
   - add an approved entry to [\`${ALLOWLIST_PATH}\`](https://github.com/elastic/kibana/blob/main/${ALLOWLIST_PATH}) and coordinate with the owning team. Use the \`oasdiffId\` and \`source\` values from the table above to [scope the allowlist entry](https://github.com/elastic/kibana/blob/main/${README_PATH}#granular-suppression) to this specific change.
   - ${releaseNote.labelStep}.
   - ${releaseNote.textStep}.

### Release note

${releaseNote.guidance}

See the [\`@kbn/api-contracts\` README](https://github.com/elastic/kibana/blob/main/${README_PATH}) for tier definitions and the allowlist workflow.`;
};

export const buildCommentBody = (allEntries: ImpactEntry[]): string => {
  const full = renderComment(allEntries, allEntries);
  if (postedCommentLength(full) <= GITHUB_COMMENT_MAX_LENGTH) {
    return full;
  }

  const shown: ImpactEntry[] = [];
  for (const entry of orderEntriesForTruncation(allEntries)) {
    const candidate = [...shown, entry];
    if (postedCommentLength(renderComment(allEntries, candidate)) > GITHUB_COMMENT_MAX_LENGTH) {
      break;
    }
    shown.push(entry);
  }

  const fitted = renderComment(allEntries, shown);
  if (postedCommentLength(fitted) > GITHUB_COMMENT_MAX_LENGTH) {
    throw new Error(
      `API contracts comment is ${postedCommentLength(
        fitted
      )} characters, above GitHub's ${GITHUB_COMMENT_MAX_LENGTH} character limit, even with no change rows`
    );
  }
  return fitted;
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

if (basename(process.argv[1] ?? '') === 'notify_api_contract_owners.ts') {
  main().catch((error) => {
    console.error('Failed to post API contract notification:', error);
    process.exit(1);
  });
}
