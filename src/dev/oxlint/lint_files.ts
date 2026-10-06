/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { relative, resolve } from 'path';

import execa from 'execa';

import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { File } from '../file';
import { LINT_LOG_PREFIX, OXLINT_CONFIG_PATH, oxlintBinPath } from './constants';

export interface LintFilesOptions {
  fix?: boolean;
  /**
   * Lint the whole repository (oxlint's own traversal) instead of passing `files` explicitly.
   * Keeps cross-file rules seeing the full module graph and avoids ARG_MAX limits.
   */
  fullRepo?: boolean;
}

export interface LintFilesResult {
  failedFiles: string[];
  lintedFileCount: number;
  warningCount: number;
}

interface OxlintDiagnostic {
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'advice';
  /** Absent for tool-level errors such as an unreadable target path. */
  filename?: string;
  labels?: Array<{ span: { line: number; column: number } }>;
}

type FileDiagnostic = OxlintDiagnostic & { filename: string };

interface OxlintJsonReport<D extends OxlintDiagnostic = OxlintDiagnostic> {
  diagnostics: D[];
  number_of_files: number;
}

const hasFilename = (d: OxlintDiagnostic): d is FileDiagnostic => Boolean(d.filename);

// ARG_MAX on macOS is 1MB; explicit path lists are batched to stay well under it.
const MAX_PATHS_PER_RUN = 4000;

// Matches ESLint's fix-pass limit.
const MAX_FIX_PASSES = 10;

async function runOxlint(args: string[]): Promise<OxlintJsonReport<FileDiagnostic>> {
  const { stdout, stderr, exitCode } = await execa(
    process.execPath,
    [oxlintBinPath, '--config', OXLINT_CONFIG_PATH, '--format', 'json', ...args],
    { cwd: REPO_ROOT, reject: false, maxBuffer: 256 * 1024 * 1024 }
  );

  // When every passed path is ignored, oxlint prints "No files found to lint." ahead of the JSON
  // report on stdout and exits 1.
  const jsonStart = stdout.indexOf('{');
  let report: OxlintJsonReport;
  try {
    report = JSON.parse(jsonStart === -1 ? stdout : stdout.slice(jsonStart));
  } catch {
    throw createFailError(`${LINT_LOG_PREFIX} exited with ${exitCode}:\n${stderr || stdout}`);
  }

  // Diagnostics without a filename are tool-level errors (e.g. "Failed to open file"), not lint
  // findings for a file.
  const toolErrors = report.diagnostics.filter((d) => !hasFilename(d));
  if (toolErrors.length > 0) {
    throw createFailError(
      `${LINT_LOG_PREFIX} exited with ${exitCode}:\n${toolErrors.map((d) => d.message).join('\n')}`
    );
  }

  // oxlint exits 1 for lint errors and for an empty file set; any other nonzero exit is a tool
  // failure (config, parser, or crash). Classified per run so one batch's lint errors cannot
  // mask another batch's failure.
  const hasErrors = report.diagnostics.some((d) => d.severity === 'error');
  const noFilesMatched = report.number_of_files === 0 && report.diagnostics.length === 0;
  const isLintExit = exitCode === 1 && (hasErrors || noFilesMatched);
  if (exitCode !== 0 && !isLintExit) {
    throw createFailError(`${LINT_LOG_PREFIX} exited with ${exitCode}:\n${stderr || stdout}`);
  }

  return { ...report, diagnostics: report.diagnostics.filter(hasFilename) };
}

async function runOxlintOnPaths(
  args: string[],
  paths: string[]
): Promise<Array<OxlintJsonReport<FileDiagnostic>>> {
  const reports: Array<OxlintJsonReport<FileDiagnostic>> = [];
  for (let i = 0; i < paths.length; i += MAX_PATHS_PER_RUN) {
    reports.push(await runOxlint([...args, ...paths.slice(i, i + MAX_PATHS_PER_RUN)]));
  }
  return reports;
}

const readContents = (paths: string[]): Promise<string[]> =>
  Promise.all(paths.map((path) => readFile(resolve(REPO_ROOT, path), 'utf8')));

/**
 * Oxlint applies a single fix pass, so fixes that overlap within a file (e.g. inserting the
 * required license header and removing a disallowed one) only partially apply. Like ESLint,
 * re-run fixes on files that still report diagnostics until their contents stop changing.
 */
async function applyRemainingFixes(diagnostics: FileDiagnostic[]): Promise<FileDiagnostic[]> {
  let current = diagnostics;
  let candidates = [...new Set(current.map((d) => d.filename))];

  for (let pass = 1; pass < MAX_FIX_PASSES && candidates.length > 0; pass++) {
    const before = await readContents(candidates);
    const latest = (await runOxlintOnPaths(['--fix'], candidates)).flatMap(
      (report) => report.diagnostics
    );
    const after = await readContents(candidates);

    const rerun = new Set(candidates);
    current = [...current.filter((d) => !rerun.has(d.filename)), ...latest];

    const remaining = new Set(latest.map((d) => d.filename));
    candidates = candidates.filter((path, i) => before[i] !== after[i] && remaining.has(path));
  }

  return current;
}

/**
 * Lints files with oxlint. Reports are written to the log.
 * Returns a result with `failedFiles` populated when errors are found.
 */
export async function lintFiles(
  log: ToolingLog,
  files: File[],
  { fix, fullRepo }: LintFilesOptions = {}
): Promise<LintFilesResult> {
  const fixArgs = fix ? ['--fix'] : [];
  const reports = fullRepo
    ? [await runOxlint(fixArgs)]
    : await runOxlintOnPaths(
        fixArgs,
        files.map((file) => relative(REPO_ROOT, file.getAbsolutePath()))
      );

  const lintedFileCount = reports.reduce((sum, report) => sum + report.number_of_files, 0);
  const firstPassDiagnostics = reports.flatMap((report) => report.diagnostics);
  const diagnostics = fix ? await applyRemainingFixes(firstPassDiagnostics) : firstPassDiagnostics;
  const failedFiles = [
    ...new Set(diagnostics.filter((d) => d.severity === 'error').map((d) => d.filename)),
  ].sort((left, right) => left.localeCompare(right));
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  if (diagnostics.length > 0) {
    const msg = diagnostics
      .map((d) => {
        const span = d.labels?.[0]?.span;
        const location = span ? `${d.filename}:${span.line}:${span.column}` : d.filename;
        return `${location}  ${d.severity}  ${d.message}  ${d.code}`;
      })
      .join('\n');
    log[failedFiles.length > 0 ? 'error' : 'warning'](msg);
  }

  if (failedFiles.length > 0) {
    log.error(`${LINT_LOG_PREFIX} errors in ${failedFiles.length} file(s)`);
  } else {
    log.success(`${LINT_LOG_PREFIX} %d files linted successfully`, lintedFileCount);
  }

  return {
    failedFiles,
    lintedFileCount,
    warningCount,
  };
}
