/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const BUMP_SERVICE_ERROR_PATTERNS = [
  'unable to compute your documentation diff',
  'please try again later',
  'please contact support at https://bump.sh',
];

interface ExecError {
  status: number | null;
  stdout: string;
  stderr: string;
  message: string;
}

export class BumpServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BumpServiceError';
  }
}

const toExecError = (error: unknown): ExecError | null => {
  if (!error || typeof error !== 'object') return null;
  const rec = error as Record<string, unknown>;
  if (!('status' in rec)) return null;
  return {
    status: (rec.status as number) ?? null,
    stdout: String(rec.stdout ?? '').trim(),
    stderr: String(rec.stderr ?? '').trim(),
    message: String((error as Error).message ?? ''),
  };
};

const matchesBumpServicePattern = ({ stderr, message }: ExecError): boolean => {
  const combined = `${stderr} ${message}`.toLowerCase();
  return BUMP_SERVICE_ERROR_PATTERNS.some((pattern) => combined.includes(pattern));
};

// Classifies errors from `bump diff` (execFileSync) into actionable types.
// BumpServiceError triggers a soft-fail in check_contracts.ts; anything else crashes the CI step.
export const toBumpDiffError = (error: unknown): never => {
  const exec = toExecError(error);

  // Known bump.sh service errors (timeouts, outages) — matched via stderr/message text
  if (exec && matchesBumpServicePattern(exec)) {
    throw new BumpServiceError(
      `bump.sh service unavailable — the API diff could not be computed. ` +
        `This is a transient error from the bump.sh external service, not a problem with your PR. ` +
        `Re-running the CI job should resolve this.`
    );
  }

  // Exit code 1 = breaking changes found, but stdout wasn't valid JSON
  // (e.g. bump-cli returned "No structural changes detected." when result.details was empty)
  if (exec?.status === 1) {
    throw new BumpServiceError(
      `bump diff exited with code 1 but produced no parseable JSON output ` +
        `(stdout: "${exec.stdout.slice(0, 200) || '(empty)'}", ` +
        `stderr: "${exec.stderr.slice(0, 200) || '(empty)'}"). ` +
        `This is likely a transient issue with the bump.sh service. ` +
        `Re-running the CI job should resolve this.`
    );
  }

  throw error;
};
