/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  hint?: string;
}

export interface DoctorCheck {
  title: string;
  run: () => Promise<CheckResult>;
}

export interface DoctorCheckGroup {
  title: string;
  checks: DoctorCheck[];
  /** Stop at the first failed check, e.g. when the rest need Docker running */
  stopOnFailure?: boolean;
}

export const pass = (message: string): CheckResult => ({ status: 'pass', message });
export const warn = (message: string, hint?: string): CheckResult => ({
  status: 'warn',
  message,
  hint,
});
export const fail = (message: string, hint?: string): CheckResult => ({
  status: 'fail',
  message,
  hint,
});
