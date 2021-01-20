/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ProcRunner } from './proc_runner';
import { ToolingLog } from '../tooling_log';

/**
 *  Create a ProcRunner and pass it to an async function. When
 *  the async function finishes the ProcRunner is torn-down
 *  automatically
 *
 *  @param  {ToolingLog} log
 *  @param  {async Function} fn
 *  @return {Promise<undefined>}
 */
export async function withProcRunner(
  log: ToolingLog,
  fn: (procs: ProcRunner) => Promise<void>
): Promise<void> {
  const procs = new ProcRunner(log);

  try {
    await fn(procs);
  } finally {
    await procs.teardown();
  }
}
