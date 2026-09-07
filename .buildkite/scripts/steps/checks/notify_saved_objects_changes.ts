/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync } from 'fs';
import parseArgs from 'minimist';
import { upsertComment } from '#pipeline-utils';

/**
 * SOURCE OF TRUTH: packages/kbn-check-saved-objects-cli/src/findings/types.ts
 *
 * These interfaces are intentionally inlined rather than imported so that this
 * Buildkite script keeps the same minimal dependency surface as the other
 * notifiers (only `#pipeline-utils`, no Kibana package deps).
 *
 * When adding, removing, or changing fields in `SavedObjectsCheckFinding`,
 * `TypeChangeDetails`, or `SavedObjectsCheckReport` in the canonical file
 * above, mirror the changes here.
 */
export interface SavedObjectsCheckFinding {
  ruleId: string;
  severity: 'error' | 'warning';
  typeName?: string;
  message: string;
  /** Plain-text supplement (e.g. fixture diff) rendered separately in PR comments. */
  details?: string;
  fixHint?: string;
  /**
   * Path fragment appended to the Saved Objects docs base URL.
   * MUST start with `#` (anchor on the same page) or `/` (relative path).
   * A value without a leading `#` or `/` will produce a malformed URL.
   */
  docsAnchor?: string;
  /** GCS URL of the regular (merge-base) baseline snapshot that triggered this finding. */
  baselineUrl?: string;
  /** GCS URL of the serverless baseline snapshot that triggered this finding. */
  serverlessBaselineUrl?: string;
}

/** Per-type model version change details for updated SO types. */
export interface TypeChangeDetails {
  /** Model versions added since the baseline, formatted as `10.x.0`. */
  newModelVersions: string[];
  /** Existing model versions modified since the baseline, formatted as `10.x.0`. */
  modifiedModelVersions: string[];
}

export interface SavedObjectsCheckReport {
  status: 'pass' | 'fail';
  /** Requested baseline commit (e.g. merge-base) passed to `--baseline`. */
  baseline?: string;
  /** GCS snapshot commit actually used when it differs from {@link baseline}. */
  baselineSnapshotSha?: string;
  /** True when the baseline snapshot came from an ancestor of {@link baseline}. */
  baselineSnapshotUsedAncestor?: boolean;
  serverlessBaseline?: string;
  serverlessBaselineSnapshotSha?: string;
  serverlessBaselineSnapshotUsedAncestor?: boolean;
  newTypes: string[];
  updatedTypes: string[];
  removedTypes: string[];
  findings: SavedObjectsCheckFinding[];
  /**
   * Per-type model version change details for updated SO types.
   * Only present when both `from` and `to` snapshots were available during the check.
   */
  typeChanges?: Record<string, TypeChangeDetails>;
  /**
   * True when the check ran against synthetic test data (either via `--test`
   * or the automatic fallback when no real SO types changed). The change lists
   * in this case reflect test fixtures, not actual contributor changes.
   */
  testMode?: boolean;
}

const COMMENT_CONTEXT = 'saved-objects-check';
const DOCS_BASE_URL = 'https://www.elastic.co/docs/extend/kibana/saved-objects';
const TROUBLESHOOTING_URL = `${DOCS_BASE_URL}/troubleshooting`;
const MODEL_VERSIONS_URL = `${DOCS_BASE_URL}#defining-model-versions`;
const FIXTURE_MISMATCH_RULE_ID = 'documents/fixture-mismatch';

const stripAnsi = (text: string): string => text.replace(/\u001B\[[0-9;]*m/g, '');

const getFindingSummary = (finding: SavedObjectsCheckFinding): string => {
  if (finding.details) {
    const newlineIndex = finding.message.indexOf('\n');
    return newlineIndex === -1 ? finding.message : finding.message.slice(0, newlineIndex);
  }

  return stripAnsi(finding.message.split('\n')[0] ?? finding.message);
};

const getFindingDiff = (finding: SavedObjectsCheckFinding): string | undefined => {
  if (finding.details) {
    return finding.details.trim();
  }

  if (finding.ruleId !== FIXTURE_MISMATCH_RULE_ID) {
    return undefined;
  }

  const newlineIndex = finding.message.indexOf('\n');
  if (newlineIndex === -1) {
    return undefined;
  }

  const diff = stripAnsi(finding.message.slice(newlineIndex + 1)).trim();
  return diff.length > 0 ? diff : undefined;
};

export const formatFindingForComment = (finding: SavedObjectsCheckFinding): string => {
  const fix = finding.fixHint ? ` _Fix:_ ${finding.fixHint}` : '';
  const baselineLinks = [
    finding.baselineUrl ? `[baseline](${finding.baselineUrl})` : null,
    finding.serverlessBaselineUrl
      ? `[serverless baseline](${finding.serverlessBaselineUrl})`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
  const links = `([docs](${findingDocsLink(finding)}))${
    baselineLinks ? ` (${baselineLinks})` : ''
  }`;
  const headline = `- **[${finding.ruleId}]** ${getFindingSummary(finding)}${fix} ${links}`;
  const diff = getFindingDiff(finding);

  if (!diff) {
    return headline;
  }

  return `${headline}\n\n\`\`\`diff\n${diff}\n\`\`\``;
};

function hasSoChanges(report: SavedObjectsCheckReport): boolean {
  return report.newTypes.length + report.updatedTypes.length + report.removedTypes.length > 0;
}

function needsTwoStepReleaseReminder(report: SavedObjectsCheckReport): boolean {
  return report.updatedTypes.length > 0 || report.removedTypes.length > 0;
}

/**
 * Returns the list of type names for which mapping changes are being introduced,
 * triggering the "only map what needs to be searchable" banner.
 *
 * - All new types always qualify.
 * - Updated types qualify when they have at least one new model version (which
 *   implies new mappings were potentially introduced). When `typeChanges` is
 *   absent (older report format) we conservatively include all updated types.
 */
function typesWithMappingChanges(report: SavedObjectsCheckReport): string[] {
  const updatedWithNewVersion = report.typeChanges
    ? report.updatedTypes.filter((t) => (report.typeChanges![t]?.newModelVersions.length ?? 0) > 0)
    : report.updatedTypes;

  return [...report.newTypes, ...updatedWithNewVersion];
}

/**
 * Builds a per-type change-detail section listing new and modified model
 * versions for each updated type. Returns an empty string when there is
 * nothing to report.
 */
function buildTypeChangeDetails(report: SavedObjectsCheckReport): string {
  const { typeChanges } = report;
  if (!typeChanges || Object.keys(typeChanges).length === 0) return '';

  const lines = Object.entries(typeChanges).flatMap(([typeName, details]) => {
    const result: string[] = [];
    if (details.newModelVersions.length > 0) {
      const versions = details.newModelVersions.map((v) => `\`${v}\``).join(', ');
      result.push(`- A new model version was introduced for type \`${typeName}\`: ${versions}.`);
    }
    if (details.modifiedModelVersions.length > 0) {
      const versions = details.modifiedModelVersions.map((v) => `\`${v}\``).join(', ');
      result.push(
        `- The following model versions have been modified for type \`${typeName}\`: ${versions}.`
      );
    }
    return result;
  });

  return lines.length > 0 ? `\n\n${lines.join('\n')}` : '';
}

function buildkiteBuildLink(): string {
  const url = process.env.BUILDKITE_BUILD_URL;
  return url ? `[Buildkite logs](${url})` : 'the Buildkite logs';
}

function listSection(title: string, items: string[]): string {
  if (items.length === 0) return '';
  return `- **${title}:** ${items.map((t) => `\`${t}\``).join(', ')}`;
}

function findingDocsLink(finding: SavedObjectsCheckFinding): string {
  const anchor = finding.docsAnchor ?? '#defining-model-versions';
  return `${DOCS_BASE_URL}${anchor}`;
}

function groupFindingsByType(
  findings: SavedObjectsCheckFinding[]
): Map<string, SavedObjectsCheckFinding[]> {
  const groups = new Map<string, SavedObjectsCheckFinding[]>();
  for (const finding of findings) {
    const key = finding.typeName ?? '_general_';
    const list = groups.get(key) ?? [];
    list.push(finding);
    groups.set(key, list);
  }
  return groups;
}

export function buildBaselineLagBanner(report: SavedObjectsCheckReport): string {
  if (!report.baselineSnapshotUsedAncestor) {
    return '';
  }

  const resolvedSha = report.baselineSnapshotSha ?? report.baseline;
  return `\n\n> [!WARNING]\n> The snapshot used as a baseline for comparison is older than the requested merge-base (\`${report.baseline}\` → \`${resolvedSha}\`). That can make unrelated Saved Object types appear changed. If you did not modify any SO type and the check is reporting updated types, rebase onto the latest \`main\` and re-run CI.`;
}

export function buildFailureBody(report: SavedObjectsCheckReport): string {
  if (report.findings.length === 0) {
    return `## Saved Objects CI check failed

The check failed but no structured findings were collected. See ${buildkiteBuildLink()} for details.

See the [Saved Objects troubleshooting guide](${TROUBLESHOOTING_URL}) and the [model versions documentation](${MODEL_VERSIONS_URL}).${buildBaselineLagBanner(
      report
    )}`;
  }

  const groups = groupFindingsByType(report.findings);
  const findingCount = report.findings.length;
  const typeCount = groups.size;

  const sections: string[] = [];
  for (const [typeName, findings] of groups) {
    const heading = typeName === '_general_' ? '### General' : `### \`${typeName}\``;
    const bullets = findings.map((f) => formatFindingForComment(f)).join('\n');
    sections.push(`${heading}\n${bullets}`);
  }

  const reproCommand = report.baseline
    ? `node scripts/check_saved_objects --baseline ${report.baseline}`
    : `node scripts/check_saved_objects --baseline <merge-base-sha>`;

  return `## Saved Objects CI check failed

${findingCount} issue(s) across ${typeCount} type(s).

${sections.join('\n\n')}

### Run locally

\`\`\`
${reproCommand}
\`\`\`

See the [Saved Objects troubleshooting guide](${TROUBLESHOOTING_URL}) and the [model versions documentation](${MODEL_VERSIONS_URL}) for details.${buildBaselineLagBanner(
    report
  )}`;
}

export function buildSuccessBody(report: SavedObjectsCheckReport): string {
  const summary = [
    listSection('New types', report.newTypes),
    listSection('Updated types', report.updatedTypes),
    listSection('Removed types', report.removedTypes),
  ]
    .filter(Boolean)
    .join('\n');

  const changeDetails = buildTypeChangeDetails(report);

  const mappingsBanner =
    typesWithMappingChanges(report).length > 0
      ? `\n\n> [!IMPORTANT]\n> Only map properties that need to be searchable and/or sortable. There is no need to include all type properties in the mappings.`
      : '';

  const reminder = needsTwoStepReleaseReminder(report)
    ? `\n\n> [!CAUTION]\n> Some Saved Objects changes (e.g. mapping additions, type removals) require a **2-step release**: ship the change first, then update consumers in a follow-up. Review the [Saved Objects model versions documentation](${MODEL_VERSIONS_URL}) before merging.`
    : '';

  return `## Saved Objects CI check passed

${summary}${changeDetails}${mappingsBanner}${buildBaselineLagBanner(report)}${reminder}`;
}

export function buildCommentBody(report: SavedObjectsCheckReport): string | null {
  // When the check ran against synthetic test data (no real SO types changed),
  // the change lists reflect test fixtures rather than contributor work.
  // Posting a comment in this case would be confusing and unhelpful.
  if (report.testMode) {
    return null;
  }
  if (report.status === 'fail') {
    return buildFailureBody(report);
  }
  if (!hasSoChanges(report)) {
    return null;
  }
  return buildSuccessBody(report);
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    string: ['report-path'],
  });

  const reportPath = args['report-path'] ?? args._[0];
  if (!reportPath) {
    console.error('Usage: notify_saved_objects_changes --report-path <file>');
    process.exit(2);
  }

  if (!existsSync(reportPath)) {
    console.log(`No report found at ${reportPath}; nothing to post.`);
    return;
  }

  let report: SavedObjectsCheckReport;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse report at ${reportPath}:`, err);
    return;
  }

  const body = buildCommentBody(report);
  if (!body) {
    console.log('Saved Objects check passed and no SO types changed; skipping PR comment.');
    return;
  }

  console.log(`Posting Saved Objects check comment (${report.status})...`);
  await upsertComment({
    commentBody: body,
    commentContext: COMMENT_CONTEXT,
    clearPrevious: true,
  });
  console.log('PR comment posted successfully');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to post Saved Objects PR comment:', error);
    process.exit(1);
  });
}
