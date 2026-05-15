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
 * Mirrors the report types in `@kbn/check-saved-objects-cli/src/findings`.
 * Inlined here so this Buildkite script keeps the same dependency surface as the
 * other notifiers (only `#pipeline-utils`).
 */
export interface SavedObjectsCheckFinding {
  ruleId: string;
  severity: 'error' | 'warning';
  typeName?: string;
  message: string;
  fixHint?: string;
  /**
   * Path fragment appended to the Saved Objects docs base URL.
   * MUST start with `#` (anchor on the same page) or `/` (relative path).
   * A value without a leading `#` or `/` will produce a malformed URL.
   */
  docsAnchor?: string;
}

export interface SavedObjectsCheckReport {
  status: 'pass' | 'fail';
  baseline?: string;
  serverlessBaseline?: string;
  newTypes: string[];
  updatedTypes: string[];
  removedTypes: string[];
  findings: SavedObjectsCheckFinding[];
}

const COMMENT_CONTEXT = 'saved-objects-check';
const DOCS_BASE_URL = 'https://www.elastic.co/docs/extend/kibana/saved-objects';
const TROUBLESHOOTING_URL = `${DOCS_BASE_URL}/validate#troubleshooting`;
const MODEL_VERSIONS_URL = `${DOCS_BASE_URL}#defining-model-versions`;

function hasSoChanges(report: SavedObjectsCheckReport): boolean {
  return report.newTypes.length + report.updatedTypes.length + report.removedTypes.length > 0;
}

function needsTwoStepReleaseReminder(report: SavedObjectsCheckReport): boolean {
  return report.updatedTypes.length > 0 || report.removedTypes.length > 0;
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

export function buildFailureBody(report: SavedObjectsCheckReport): string {
  if (report.findings.length === 0) {
    return `## Saved Objects CI check failed

The check failed but no structured findings were collected. See ${buildkiteBuildLink()} for details.

See the [Saved Objects troubleshooting guide](${TROUBLESHOOTING_URL}) and the [model versions documentation](${MODEL_VERSIONS_URL}).`;
  }

  const groups = groupFindingsByType(report.findings);
  const findingCount = report.findings.length;
  const typeCount = groups.size;

  const sections: string[] = [];
  for (const [typeName, findings] of groups) {
    const heading = typeName === '_general_' ? '### General' : `### \`${typeName}\``;
    const bullets = findings
      .map((f) => {
        const fix = f.fixHint ? ` _Fix:_ ${f.fixHint}` : '';
        return `- **[${f.ruleId}]** ${f.message}${fix} ([docs](${findingDocsLink(f)}))`;
      })
      .join('\n');
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

See the [Saved Objects troubleshooting guide](${TROUBLESHOOTING_URL}) and the [model versions documentation](${MODEL_VERSIONS_URL}) for details.`;
}

export function buildSuccessBody(report: SavedObjectsCheckReport): string {
  const summary = [
    listSection('New types', report.newTypes),
    listSection('Updated types', report.updatedTypes),
    listSection('Removed types', report.removedTypes),
  ]
    .filter(Boolean)
    .join('\n');

  const reminder = needsTwoStepReleaseReminder(report)
    ? `\n\n> Some Saved Objects changes (e.g. mapping additions, type removals) require a **2-step release**: ship the change first, then update consumers in a follow-up. Review the [Saved Objects model versions documentation](${MODEL_VERSIONS_URL}) before merging.`
    : '';

  return `## Saved Objects CI check passed

${summary}${reminder}`;
}

export function buildCommentBody(report: SavedObjectsCheckReport): string | null {
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
