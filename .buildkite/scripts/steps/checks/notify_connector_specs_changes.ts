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
 * Report shape produced by run_connector_release_check.js. Inlined here (rather
 * than imported) to keep this Buildkite script's dependency surface minimal,
 * matching notify_saved_objects_changes.ts.
 */
interface ConnectorReleaseFinding {
  id: string;
  supportedFeatureIds: string[];
  disallowedFeatureIds: string[];
  message: string;
}

interface ConnectorReleaseReport {
  findings: ConnectorReleaseFinding[];
  note?: string;
}

const COMMENT_CONTEXT = 'connector-specs-check';

export function buildCommentBody(report: ConnectorReleaseReport): string | null {
  if (!report.findings || report.findings.length === 0) {
    return null;
  }

  const bullets = report.findings.map((f) => `- ${f.message}`).join('\n');

  return `## Connector spec release check

> [!WARNING]
> This is **advisory** — it does not block the PR. It enforces a 2-step release for **new** connector types so that user-created actions never reference a connector type missing from the deployed release (which would break them on rollback).

${report.findings.length} connector(s) need attention:

${bullets}`;
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
    console.log('Connector spec release check found nothing to report; skipping PR comment.');
    return;
  }

  console.log(
    `Posting connector spec release check comment (${report.findings.length} finding(s))...`
  );
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
