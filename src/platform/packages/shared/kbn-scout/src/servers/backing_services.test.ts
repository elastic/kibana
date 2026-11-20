/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { resolveRunOutcome } from './backing_services';

const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });
const base = { log, interruptedMessage: 'interrupted' };

describe('resolveRunOutcome', () => {
  const originalExitCode = process.exitCode;
  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('is ok when nothing failed', () => {
    expect(resolveRunOutcome({ ...base, interrupted: false })).toBe('ok');
  });

  it('reports an interrupt ahead of everything the interrupted steps threw or reported', () => {
    expect(
      resolveRunOutcome({
        ...base,
        interrupted: true,
        earlyExitError: new Error('ES exitted unexpectedly'),
        runError: new Error('ProcRunner is closing'),
        shutdownError: new Error('kill failed'),
      })
    ).toBe('interrupted');
    expect(process.exitCode).toBe(130);
  });

  it('reports an AbortError the run itself threw as a failure: only the signal hook interrupts', () => {
    const error = new Error('fetch aborted');
    error.name = 'AbortError';
    expect(() => resolveRunOutcome({ ...base, interrupted: false, runError: error })).toThrow(
      'fetch aborted'
    );
  });

  it('reports an early exit ahead of the abort its teardown caused', () => {
    const abort = new Error('start aborted');
    abort.name = 'AbortError';
    expect(() =>
      resolveRunOutcome({
        ...base,
        interrupted: false,
        earlyExitError: new Error('ES exitted unexpectedly'),
        runError: abort,
      })
    ).toThrow('ES exitted unexpectedly');
  });

  it('reports an early exit ahead of the run error it caused', () => {
    expect(() =>
      resolveRunOutcome({
        ...base,
        interrupted: false,
        earlyExitError: new Error('container exited'),
        runError: new Error('kibana exited early'),
      })
    ).toThrow('container exited');
  });

  it('reports the run error ahead of a shutdown error', () => {
    expect(() =>
      resolveRunOutcome({
        ...base,
        interrupted: false,
        runError: new Error('kibana down'),
        shutdownError: new Error('kill failed'),
      })
    ).toThrow('kibana down');
  });

  it('reports a shutdown error when the run itself was fine', () => {
    expect(() =>
      resolveRunOutcome({ ...base, interrupted: false, shutdownError: new Error('kill failed') })
    ).toThrow('kill failed');
  });
});
