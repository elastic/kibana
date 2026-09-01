/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  filename: string;
  labels?: Array<{ span: { line: number; column: number } }>;
}

interface OxlintJsonReport {
  diagnostics: OxlintDiagnostic[];
  number_of_files: number;
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
  const { stdout, stderr, exitCode } = await execa(
    oxlintBinPath,
    [
      '--config',
      OXLINT_CONFIG_PATH,
      '--format',
      'json',
      ...(fix ? ['--fix'] : []),
      ...(fullRepo ? [] : files.map((file) => file.getRelativePath())),
    ],
    { cwd: REPO_ROOT, reject: false, maxBuffer: 256 * 1024 * 1024 }
  );

  let report: OxlintJsonReport;
  try {
    report = JSON.parse(stdout);
  } catch {
    throw createFailError(`${LINT_LOG_PREFIX} exited with ${exitCode}:\n${stderr || stdout}`);
  }

  const { diagnostics } = report;
  const failedFiles = [
    ...new Set(diagnostics.filter((d) => d.severity === 'error').map((d) => d.filename)),
  ].sort((left, right) => left.localeCompare(right));
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  // oxlint exits 1 for lint errors; anything else without error diagnostics is a tool failure.
  if (exitCode !== 0 && failedFiles.length === 0) {
    throw createFailError(`${LINT_LOG_PREFIX} exited with ${exitCode}:\n${stderr}`);
  }

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
    log.success(`${LINT_LOG_PREFIX} %d files linted successfully`, report.number_of_files);
  }

  return {
    failedFiles,
    lintedFileCount: report.number_of_files,
    warningCount,
  };
}
