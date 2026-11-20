/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gracefulExit } from 'exit-hook';

/**
 * Runs a polling loop that would otherwise continue until its timeout even if SIGINT is signaled,
 * exiting on SIGINT while it runs. Through exit-hook, not `process.exit()`: whoever started the
 * cluster may have registered an asynchronous shutdown hook (e.g. Scout stopping its docker
 * containers), and `process.exit()` skips those; with no hooks registered this is the plain exit
 * it always was. Only while the loop runs: left registered, the listener would cut every later
 * shutdown short the same way.
 */
export async function withExitOnSigint<T>(fn: () => Promise<T>): Promise<T> {
  const exitOnSigint = () => gracefulExit();
  process.on('SIGINT', exitOnSigint);
  try {
    return await fn();
  } finally {
    process.off('SIGINT', exitOnSigint);
  }
}
