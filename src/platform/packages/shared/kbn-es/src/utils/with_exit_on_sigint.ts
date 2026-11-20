/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gracefulExit } from 'exit-hook';

/** Runs a polling loop that would otherwise outlive a SIGINT, exiting on SIGINT only while it runs. */
export async function withExitOnSigint<T>(fn: () => Promise<T>): Promise<T> {
  // Through exit-hook, not `process.exit()`: whoever started the cluster may have registered an
  // asynchronous shutdown hook (e.g. Scout stopping its docker containers), which `process.exit()`
  // skips; with no hooks registered this is the plain exit it always was. Only while the loop
  // runs: left registered, the listener would cut every later shutdown short the same way.
  const exitOnSigint = () => gracefulExit();
  process.on('SIGINT', exitOnSigint);
  try {
    return await fn();
  } finally {
    process.off('SIGINT', exitOnSigint);
  }
}
