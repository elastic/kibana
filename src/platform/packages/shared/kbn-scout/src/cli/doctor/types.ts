/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface Fix {
  /** Exact command shown to the user and run by --fix */
  command: string;
  /** Asks for confirmation before running, e.g. when it deletes files or kills processes */
  destructive?: boolean;
  /** Overrides running `command`, e.g. to wait until Docker is ready */
  run?: () => Promise<void>;
}

export interface CheckResult {
  status: CheckStatus;
  message: string;
  /** Shown when there is no command to fix it */
  hint?: string;
  fix?: Fix;
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

type Remedy = Pick<CheckResult, 'hint' | 'fix'>;

export const pass = (message: string): CheckResult => ({ status: 'pass', message });
export const warn = (message: string, remedy?: Remedy): CheckResult => ({
  status: 'warn',
  message,
  ...remedy,
});
export const fail = (message: string, remedy?: Remedy): CheckResult => ({
  status: 'fail',
  message,
  ...remedy,
});
