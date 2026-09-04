/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakinessReport, SuppressionReason } from './schema';
import { isFixCandidate } from '../mechanism/classify';

const percent = (value: number): string => `${(value * 100).toFixed(2)}%`;

const shortenPath = (filePath: string, segments = 3): string => {
  const parts = filePath.split('/');
  return parts.length <= segments ? filePath : `…/${parts.slice(-segments).join('/')}`;
};

const padEnd = (value: string, width: number): string => value.padEnd(width, ' ');
const padStart = (value: string, width: number): string => value.padStart(width, ' ');

/**
 * Renders the report as a text table for a terminal or a workflow job summary. Ordered by the
 * Wilson lower bound, so the top row is the cluster with the most defensible build impact.
 */
export const renderSummary = (report: FlakinessReport): string => {
  const lines: string[] = [];

  lines.push(
    `Flaky test analysis — ${report.window.lookbackDays}d window, ` +
      `pipelines: ${report.policy.pipelineSlugs.join(', ')}`
  );
  lines.push(
    `${report.clusters.length} clusters admitted, ${report.suppressed.length} specs suppressed`
  );
  lines.push('');

  if (report.clusters.length > 0) {
    const header =
      `${padStart('LB%', 7)} ${padStart('BLD%', 7)} ${padStart('blds', 6)} ` +
      `${padStart('fail', 6)} ${padStart('tests', 6)} ${padEnd('mechanism', 15)} ${padEnd(
        'fix?',
        5
      )} spec`;
    lines.push(header);
    lines.push('-'.repeat(header.length));

    for (const cluster of report.clusters) {
      lines.push(
        `${padStart(percent(cluster.impact.wilsonLowerBound), 7)} ` +
          `${padStart(percent(cluster.impact.buildFailRate), 7)} ` +
          `${padStart(String(cluster.impact.builds), 6)} ` +
          `${padStart(String(cluster.impact.failedBuilds), 6)} ` +
          `${padStart(String(cluster.members.length), 6)} ` +
          `${padEnd(cluster.mechanism, 15)} ` +
          `${padEnd(isFixCandidate(cluster.mechanism) ? 'yes' : 'no', 5)} ` +
          shortenPath(cluster.filePath)
      );
    }
    lines.push('');
  }

  const suppressedByReason = report.suppressed.reduce<Partial<Record<SuppressionReason, number>>>(
    (counts, entry) => ({ ...counts, [entry.reason]: (counts[entry.reason] ?? 0) + 1 }),
    {}
  );

  const reasons = Object.entries(suppressedByReason);
  if (reasons.length > 0) {
    lines.push('Suppressed:');
    for (const [reason, count] of reasons) {
      lines.push(`  ${padEnd(reason, 20)} ${count}`);
    }
  }

  return lines.join('\n');
};
