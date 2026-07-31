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

/**
 * Report shape produced by run_connector_release_check.js. Inlined here (rather than
 * imported) to keep this Buildkite script's dependency surface minimal, matching
 * notify_saved_objects_changes.ts.
 */
export interface ConnectorReleaseFinding {
  id: string;
  supportedFeatureIds: string[];
  disallowedFeatureIds: string[];
  missingFromRefs: string[];
  message: string;
}

export interface ConnectorReleaseReport {
  status: 'safe' | 'unsafe' | 'inconclusive';
  reason?: string;
  /** False when the merge-base diff could not be computed, so applicability is unknown. */
  applicabilityKnown: boolean;
  /** Every distinct Production-NonCanary Kibana ref that was inspected. */
  refs: string[];
  applicableConnectors: Array<{ id: string; supportedFeatureIds: string[] }>;
  findings: ConnectorReleaseFinding[];
}

const COMMENT_CONTEXT = 'connector-specs-check';

const ADVISORY_NOTE =
  '> [!NOTE]\n' +
  '> This is **advisory** — it does not block the PR. It checks the 2-step release policy ' +
  'for connector types: until a type is registered in every version currently pinned for the ' +
  'Production-NonCanary slices, a rollout or rollback can leave a node without it, breaking any ' +
  'user action that references it.';

const shortSha = (sha: string) => sha.slice(0, 12);

const inspectedVersions = (refs: string[]) =>
  refs.length > 0
    ? `Versions currently pinned for the Production-NonCanary slices: ${refs
        .map(shortSha)
        .join(', ')}.`
    : 'No Production-NonCanary versions were inspected.';

export function buildUnsafeBody(report: ConnectorReleaseReport): string {
  const bullets = report.findings.map((finding) => `- ${finding.message}`).join('\n');

  return `## Connector spec release check: needs attention

${ADVISORY_NOTE}

${report.findings.length} connector(s) declare user-facing features before being released:

${bullets}

${inspectedVersions(report.refs)}`;
}

export function buildSafeBody(report: ConnectorReleaseReport): string {
  const ids = report.applicableConnectors.map(({ id }) => `\`${id}\``).join(', ');

  return `## Connector spec release check: no issues found

${ADVISORY_NOTE}

Checked ${ids}. As of this run, the declared feature IDs are compatible with the 2-step release policy.

${inspectedVersions(report.refs)}`;
}

export function buildInconclusiveBody(report: ConnectorReleaseReport): string {
  return `## Connector spec release check: inconclusive

${ADVISORY_NOTE}

The check could not determine what is released, so it is **not** reporting this PR as safe.

Reason: ${report.reason ?? 'unknown'}

${inspectedVersions(report.refs)}`;
}

export function buildCommentBody(report: ConnectorReleaseReport): string | null {
  // Nothing to say: either applicability could not be determined, or this PR changed no connector
  // exposure (a lib, docs, or icon edit). Any existing comment is left alone — the step is
  // path-gated on connector changes, so it cannot be relied on to run and clean up after itself.
  if (!report.applicabilityKnown || report.applicableConnectors.length === 0) {
    return null;
  }

  if (report.status === 'unsafe') {
    return buildUnsafeBody(report);
  }
  if (report.status === 'inconclusive') {
    return buildInconclusiveBody(report);
  }
  return buildSafeBody(report);
}

async function main() {
  const reportPath = process.argv[2] === '--report-path' ? process.argv[3] : process.argv[2];
  if (!reportPath) {
    console.error('Usage: notify_connector_specs_changes --report-path <file>');
    process.exit(2);
  }

  if (!existsSync(reportPath)) {
    console.log(`No report found at ${reportPath}; nothing to post.`);
    return;
  }

  let report: ConnectorReleaseReport;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse report at ${reportPath}:`, err);
    return;
  }

  const body = buildCommentBody(report);
  if (!body) {
    console.log('Nothing to report for this PR; leaving any existing comment untouched.');
    return;
  }

  console.log(`Posting connector spec release check comment (${report.status})...`);
  await upsertComment({
    commentBody: body,
    commentContext: COMMENT_CONTEXT,
    clearPrevious: true,
  });

  console.log('PR comment posted successfully');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to post connector spec release PR comment:', error);
    process.exit(1);
  });
}
