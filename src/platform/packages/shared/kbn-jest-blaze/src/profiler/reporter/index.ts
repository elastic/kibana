/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
import chalk from 'chalk';
import { table, getBorderCharacters, TableUserConfig } from 'table';
import Path from 'path';
import { Config } from '@jest/types';
import { TestContext, TestResult } from '@jest/test-result';
import { orderBy } from 'lodash';
import { REPO_ROOT } from '@kbn/repo-info';
import { jestProfilerRuntime } from '../runtime';
import { getTermWidth } from './terminal';
import { formatMs } from './formatters/format_ms';
import { formatFilepath } from './formatters/format_filepath';
import { formatRequireStack } from './formatters/format_require_stack';

interface ReporterOptions {
  topN?: number;
}

interface FileStat {
  filepath: string;
  executeTime: number | undefined;
  executeCount: number | undefined;
  requireTime: number | undefined;
  directRequireCount: number | undefined;
  requireCount: number | undefined;
  lastRequireStack: string[] | undefined;
  processTime: number | undefined;
  selfTime: number | undefined;
}

interface Column {
  label: string;
  width?: number;
  legend?: string;
  format: (stat: FileStat, max: number) => string;
}

interface Table {
  label: string;
  columns: Column[];
  rows: FileStat[];
}

export class JestBlazeProfilerReporter {
  private readonly topN: number;
  constructor(_globalConfig: Config.InitialOptions, options: ReporterOptions = {}) {
    this.topN = options.topN ?? 10;
  }

  onRunComplete(_contexts: TestContext[], _results: TestResult[]) {
    const runtime = jestProfilerRuntime;
    if (!runtime) {
      return;
    }

    const timings = runtime.timings;

    const allFiles = Array.from(
      new Set([
        ...timings.totalExecuteTime.keys(),
        ...timings.totalExecuteCount.keys(),
        ...timings.totalDirectRequires.keys(),
        ...timings.totalRequires.keys(),
        ...timings.totalRequireTime.keys(),
        ...timings.totalProcessTime.keys(),
      ])
    );

    const statsWithFiles: FileStat[] = allFiles.map((file) => {
      const executeTime = timings.totalExecuteTime.get(file);
      const requireTime = timings.totalRequireTime.get(file);

      const filepath = Path.relative(REPO_ROOT, file);

      return {
        filepath,
        executeTime: timings.totalExecuteTime.get(file),
        executeCount: timings.totalExecuteCount.get(file),
        requireTime,
        directRequireCount: timings.totalDirectRequires.get(file),
        requireCount: timings.totalRequires.get(file),
        lastRequireStack: timings.lastRequireStack
          .get(file)
          ?.map((requiringFile) => Path.relative(REPO_ROOT, requiringFile)),
        processTime: timings.totalProcessTime.get(file),
        selfTime: executeTime !== undefined ? executeTime - (requireTime ?? 0) : undefined,
      };
    });

    if (statsWithFiles.length === 0) {
      return;
    }

    const byExecTimeDesc = orderBy(statsWithFiles, (stats) => stats.executeTime ?? 0, 'desc').slice(
      0,
      this.topN
    );

    const byProcessTimeDesc = orderBy(
      statsWithFiles,
      (stats) => stats.processTime ?? 0,
      'desc'
    ).slice(0, this.topN);

    const byTotalRequiresDesc = orderBy(
      statsWithFiles,
      (stats) => stats.requireCount ?? 0,
      'desc'
    ).slice(0, this.topN);

    const bySelfTimeDesc = orderBy(statsWithFiles, (stats) => stats.selfTime ?? 0, 'desc').slice(
      0,
      this.topN
    );

    const minimalBorder = {
      ...getBorderCharacters('void'),
      joinBody: '─',
      joinJoin: '─',
    };

    console.log('\n' + chalk.bold('[jest-blaze] Profiling summary'));

    const tableWidth = getTermWidth();

    const columns = {
      file: {
        label: 'File',
        format: (stat, max) => formatFilepath(stat.filepath, max),
      },
      fileWithStack: {
        label: 'File',
        format: (stat, max) => {
          // For the self-time table, we show the file path but let the stack be handled separately
          return formatFilepath(stat.filepath, max);
        },
      },
      process: {
        label: 'Process',
        width: 10,
        format: (stat) => `${chalk.yellowBright(formatMs(stat.processTime))}`,
      },
      exec: {
        label: 'Exec',
        legend: `${chalk.yellow('total')}/avg/#`,
        width: 14,
        format: (stat) => {
          const totalExecutionTime = stat.executeTime ?? 0;
          const executionCount = stat.executeCount ?? 0;

          const avg = totalExecutionTime / executionCount;
          return `${chalk.yellow(formatMs(totalExecutionTime))}${chalk.gray('/')}\
${chalk.gray(formatMs(avg))}${chalk.gray('/')}\
${chalk.gray(`${executionCount}x`)}`;
        },
      },
      self: {
        label: 'Self',
        legend: 'total/avg',
        width: 14,
        format: (stat) => {
          const avg = (stat.selfTime ?? 0) / (stat.executeCount ?? 1);
          return `${chalk.yellow(formatMs(stat.selfTime))}/${chalk.gray(`${formatMs(avg)}`)} `;
        },
      },
      requires: {
        label: 'Requires',
        legend: `${chalk.cyanBright('dir')} (total)`,
        width: 20,
        format: (stat) => {
          const directRequiresTotal = stat.directRequireCount ?? 0;
          const allRequiresTotal = stat.requireCount ?? 0;
          const executionCount = stat.executeCount ?? 0;

          const dirAvg = Math.round(directRequiresTotal / executionCount);
          const allAvg = Math.round(allRequiresTotal / executionCount);

          return `${chalk.cyanBright(directRequiresTotal)}${chalk.gray('/')}\
${chalk.cyan(allRequiresTotal)} ${chalk.gray(`(${dirAvg}`)}${chalk.gray('/')}\
${chalk.gray(`${allAvg})`)} `;
        },
      },
    } satisfies Record<string, Column>;

    const tables = {
      exec: {
        label: `Top ${this.topN} slowest requires`,
        columns: [columns.file, columns.exec, columns.requires],
        rows: byExecTimeDesc,
      },
      process: {
        label: `Top ${this.topN} files by process time`,
        columns: [columns.file, columns.process],
        rows: byProcessTimeDesc,
      },
      requires: {
        label: `Top ${this.topN} most nested (by avg) per file`,
        columns: [columns.file, columns.requires],
        rows: byTotalRequiresDesc,
      },
      self: {
        label: `Top ${this.topN} files by self time`,
        columns: [columns.fileWithStack, columns.self],
        rows: bySelfTimeDesc,
      },
    } satisfies Record<string, Table>;

    // Render each table
    this.renderTable(tables.exec, tableWidth, minimalBorder);
    this.renderTable(tables.process, tableWidth, minimalBorder);
    this.renderTable(tables.requires, tableWidth, minimalBorder);
    this.renderTableWithStack(tables.self, tableWidth, minimalBorder);
  }

  private renderTable(tableConfig: Table, tableWidth: number, minimalBorder: any) {
    const rowFormatter = (stat: FileStat, fileMaxWidth: number): string[][] => {
      const row = tableConfig.columns.map((col) => {
        const maxWidth = col.width ?? fileMaxWidth;
        return col.format(stat, maxWidth);
      });
      return [row];
    };

    this._renderTable(tableConfig, tableWidth, minimalBorder, rowFormatter, true);
  }

  private renderTableWithStack(tableConfig: Table, tableWidth: number, minimalBorder: any) {
    const rowFormatter = (stat: FileStat, fileMaxWidth: number): string[][] => {
      const mainRow = tableConfig.columns.map((col) => {
        const maxWidth = col.width ?? fileMaxWidth;
        return col.format(stat, maxWidth);
      });

      const bodyRows = [mainRow];

      if (stat.lastRequireStack && stat.lastRequireStack.length > 0) {
        const stackLines = formatRequireStack(stat.lastRequireStack, fileMaxWidth - 4);
        stackLines.forEach((line) => {
          const stackRow = new Array(tableConfig.columns.length).fill('');
          stackRow[0] = chalk.gray(line);
          bodyRows.push(stackRow);
        });
      }

      bodyRows.push(new Array(tableConfig.columns.length).fill('')); // Spacing after each entry
      return bodyRows;
    };

    this._renderTable(tableConfig, tableWidth, minimalBorder, rowFormatter, false);
  }

  private _renderTable(
    tableConfig: Table,
    tableWidth: number,
    minimalBorder: any,
    rowFormatter: (stat: FileStat, fileMaxWidth: number) => string[][],
    wrapWord: boolean
  ) {
    if (tableConfig.rows.length === 0) return;

    // Calculate column widths
    const fixedCols = tableConfig.columns.filter((col) => col.width);
    const fixedWidth = fixedCols.reduce((sum, col) => sum + (col.width ?? 0), 0);
    const padding = tableConfig.columns.length * 2; // 2 chars padding per column
    const separators = tableConfig.columns.length > 0 ? tableConfig.columns.length - 1 : 0;
    const fileMaxWidth = Math.max(30, tableWidth - fixedWidth - padding - separators);

    // Create header row
    const headerRow = tableConfig.columns.map((col) => {
      let header = chalk.cyan.bold(col.label);
      if (col.legend) {
        header += '\n' + chalk.gray(`(${col.legend})`);
      }
      return header;
    });

    // Create data rows using the provided formatter
    const bodyRows = tableConfig.rows.flatMap((stat) => rowFormatter(stat, fileMaxWidth));

    const rows = [headerRow, ...bodyRows];

    // Configure table
    const config = {
      border: minimalBorder,
      drawHorizontalLine: (index: number) => index === 1,
      columnDefault: { paddingLeft: 0, paddingRight: 2 },
      columns: Object.fromEntries(
        tableConfig.columns.map((col, index) => [
          index,
          {
            width: col.width ?? fileMaxWidth,
            wrapWord: !col.width && wrapWord,
          },
        ])
      ),
    } satisfies TableUserConfig;

    const out = table(rows as unknown as readonly (readonly unknown[])[], config);

    console.log(chalk.yellow(tableConfig.label + ':'));
    console.log(out);
  }
}

// CommonJS compatibility for Jest configuration loading
module.exports = JestBlazeProfilerReporter;
