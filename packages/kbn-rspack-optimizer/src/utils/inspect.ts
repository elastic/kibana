/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

let portCounter: number | undefined;
let detectedFlag: string | undefined;
let initialized = false;

/**
 * Lazily detect --inspect or --inspect-brk in the parent process's execArgv
 * and determine the starting port for worker processes.
 */
function init() {
  if (initialized) return;
  initialized = true;

  const idx = process.execArgv.findIndex((flag) => flag.startsWith('--inspect'));
  if (idx === -1) return;

  const argv = process.execArgv[idx];
  if (argv.includes('=')) {
    const [flag, hostPort] = argv.split('=');
    detectedFlag = flag;
    const portStr = hostPort.includes(':') ? hostPort.split(':').pop()! : hostPort;
    portCounter = Number.parseInt(portStr, 10) + 1;
  } else {
    detectedFlag = argv;
    const next = process.execArgv[idx + 1];
    if (next && /^[0-9]+$/.test(next)) {
      portCounter = Number.parseInt(next, 10) + 1;
    } else {
      portCounter = 9230;
    }
  }
}

/**
 * Returns execArgv entries that forward the parent's --inspect/--inspect-brk
 * flag to a worker process with an auto-incremented port.
 *
 * Returns an empty array when:
 * - `inspectWorkers` is false
 * - the parent process is not being inspected
 */
export function getInspectExecArgv(inspectWorkers: boolean): string[] {
  if (!inspectWorkers) return [];

  init();

  if (!detectedFlag || portCounter === undefined) return [];

  return [`${detectedFlag}=${portCounter++}`];
}

/**
 * Reset internal state — only for testing.
 */
export function resetInspectState() {
  portCounter = undefined;
  detectedFlag = undefined;
  initialized = false;
}
