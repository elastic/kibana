/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import CliTable3 from 'cli-table3';
import dedent from 'dedent';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  compareByFailedBuilds,
  type FlakyTestBranchStats,
  type FlakyTestClassification,
  type FlakyTestEntry,
  type FlakyTestReport,
} from '../reporting/flaky_tests';

const TITLE_COL_WIDTH = 40;
const FILE_COL_WIDTH = 40;
const OWNERS_COL_WIDTH = 34;

// cell padding takes 2 columns
const contentWidth = (colWidth: number): number => colWidth - 2;

/**
 * cli-table3 only wraps on whitespace and truncates anything longer, so break paths on `/` and
 * owner handles on `-` ourselves, keeping the separator at the end of the broken line. A single
 * segment longer than the width is split hard rather than truncated.
 */
export const wrapOn = (text: string, separator: string, width: number): string => {
  const lines: string[] = [];
  let current = '';
  const flush = () => {
    for (let start = 0; start < current.length; start += width) {
      lines.push(current.slice(start, start + width));
    }
    current = '';
  };
  // every segment but the last carries its separator so line lengths account for it
  const segments = text.split(separator);
  const parts = segments.map((segment, index) =>
    index < segments.length - 1 ? `${segment}${separator}` : segment
  );
  for (const part of parts) {
    if (current && current.length + part.length > width) {
      flush();
    }
    current += part;
  }
  flush();
  return lines.join('\n');
};

/** Coarse relative age such as `5m ago`, `3h ago` or `2d ago`. */
export const formatAge = (from: Date, to: Date): string => {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (24 * 60))}d ago`;
};

const formatRate = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

/**
 * Branch with the highest build failure rate. Branches with fewer builds than `minBuilds` only
 * count when no branch has enough, so one failure on a barely exercised branch does not win.
 */
export const flakiestBranch = (
  byBranch: FlakyTestEntry['byBranch'],
  minBuilds: number
): FlakyTestBranchStats | undefined => {
  const exercised = byBranch.filter((stats) => stats.builds >= minBuilds);
  return [...(exercised.length > 0 ? exercised : byBranch)].sort(
    (a, b) => b.buildFailRate - a.buildFailRate
  )[0];
};

const formatFlakiestBranch = (flakiest: FlakyTestBranchStats | undefined): string =>
  flakiest ? `${flakiest.branch} (${formatRate(flakiest.buildFailRate)})` : '-';

/** Latest run on the flakiest branch, falling back to the latest run on any branch. */
const formatLatestRun = (
  entry: FlakyTestEntry,
  flakiest: FlakyTestBranchStats | undefined,
  now: Date
): string => {
  const latestRun = flakiest?.latestRun ?? entry.latestRun;
  return latestRun ? `${latestRun.status}\n${formatAge(latestRun.timestamp, now)}` : '-';
};

/** Groups entries by file, preserving the order in which files first appear. */
export const groupByFile = <T extends { entry: Pick<FlakyTestEntry, 'filePath'> }>(
  items: readonly T[]
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const { filePath } = item.entry;
    groups.set(filePath, [...(groups.get(filePath) ?? []), item]);
  }
  return groups;
};

/** A test together with the list of the report it came from. */
export interface ClassifiedEntry {
  entry: FlakyTestEntry;
  classification: FlakyTestClassification;
}

const CLASSIFICATION_COLOR: Record<FlakyTestClassification, (text: string) => string> = {
  flaky: chalk.yellow,
  'consistently-failing': chalk.red,
};

const colorize = (classification: FlakyTestClassification, text: string | number): string =>
  CLASSIFICATION_COLOR[classification](String(text));

/** Both report lists as one ranking, so the table can show the worst offenders of either kind. */
export const classifiedEntries = (
  report: Pick<FlakyTestReport, 'flaky' | 'consistentlyFailing'>
): ClassifiedEntry[] =>
  [
    ...report.flaky.map((entry) => ({ entry, classification: 'flaky' as const })),
    ...report.consistentlyFailing.map((entry) => ({
      entry,
      classification: 'consistently-failing' as const,
    })),
  ].sort((a, b) => compareByFailedBuilds(a.entry, b.entry));

/**
 * Renders the top-ranked tests one per row, with the tests of the same file kept together (in
 * order of first appearance) under a single spanning file cell so whole-suite failures stand out.
 * Rank and title are yellow for flaky tests and red for consistently failing ones.
 */
export const buildTopFailingTable = (
  top: readonly ClassifiedEntry[],
  all: readonly ClassifiedEntry[],
  minBuilds: number,
  now: Date
): CliTable3.Table => {
  const table = new CliTable3({
    head: ['#', 'Framework', 'Owners', 'Failed builds', 'Flakiest', 'Latest', 'Test', 'File'],
    colWidths: [null, null, OWNERS_COL_WIDTH, null, null, null, TITLE_COL_WIDTH, FILE_COL_WIDTH],
    // the default red header would clash with red meaning "consistently failing"
    style: { head: ['bold'] },
    wordWrap: true,
  });
  const qualifyingPerFile = groupByFile(all);

  let rank = 0;
  for (const [filePath, entries] of groupByFile(top)) {
    const notShown = (qualifyingPerFile.get(filePath)?.length ?? 0) - entries.length;
    const fileCell: CliTable3.Cell = {
      rowSpan: entries.length,
      content: [
        wrapOn(filePath, '/', contentWidth(FILE_COL_WIDTH)),
        notShown > 0 ? `(+${notShown} more in this file)` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };

    entries.forEach(({ entry, classification }, index) => {
      rank += 1;
      const flakiest = flakiestBranch(entry.byBranch, minBuilds);
      table.push([
        colorize(classification, rank),
        entry.framework,
        entry.owners
          .map((owner) => wrapOn(owner, '-', contentWidth(OWNERS_COL_WIDTH)))
          .join('\n') || '-',
        `${entry.failedBuilds}/${entry.builds}`,
        formatFlakiestBranch(flakiest),
        formatLatestRun(entry, flakiest, now),
        colorize(classification, entry.title),
        // later rows are laid out around the spanning cell, so only the first row carries it
        ...(index === 0 ? [fileCell] : []),
      ]);
    });
  }

  return table;
};

/** Writes a panel with the report window, scope, totals and the top failing tests to the log. */
export const displaySummary = (report: FlakyTestReport, limit: number, log: ToolingLog): void => {
  const { window, scope, thresholds, summary } = report;
  const flakyByFramework = Object.entries(summary.flakyByFramework)
    .map(([framework, count]) => `${framework}: ${count}`)
    .join(', ');

  const panel = new CliTable3();
  panel.push(
    [{ content: 'Flaky tests summary', hAlign: 'center' }],
    [
      dedent(`\
        Window
          From     : ${window.from.toISOString()}
          To       : ${window.to.toISOString()}
          Lookback : ${window.lookbackDays}d
        `),
    ],
    [
      dedent(`\
        Scope
          Pipelines  : ${scope.pipelines.join(', ') || 'any'}
          Branches   : ${scope.branches.join(', ') || 'any'}
          Frameworks : ${scope.frameworks.join(', ')}
        `),
    ],
    [
      dedent(`\
        Thresholds
          Min builds        : ${thresholds.minBuilds} (tests seen in fewer builds are ignored)
          Min failed builds : ${thresholds.minFailedBuilds} (tests that failed in fewer builds are ignored)
          Max tests         : ${thresholds.maxTests} per list
          Flaky                = qualifying test with at least one pass or in-run retry recovery
          Consistently failing = qualifying test that never passed in the window
        `),
    ],
    [
      dedent(`\
        Results
          Flaky                : ${summary.totalFlaky}${
        flakyByFramework ? ` (${flakyByFramework})` : ''
      }
          Consistently failing : ${summary.totalConsistentlyFailing}
        `),
    ]
  );

  const all = classifiedEntries(report);
  const top = all.slice(0, limit);
  if (top.length > 0) {
    const legend = `${chalk.yellow('flaky')}, ${chalk.red('consistently failing')}`;
    panel.push([
      `Top ${top.length} failing tests by failed builds (${legend})\n${buildTopFailingTable(
        top,
        all,
        report.thresholds.minBuilds,
        report.generatedAt
      ).toString()}`,
    ]);
  }

  log.write('\n');
  log.write(panel.toString());
};
