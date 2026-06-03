/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runStackMonitor } from './run_stack_monitor';

jest.mock('./process_node_stack_monitoring', () => ({
  processNodeStackMonitoring: jest.fn(),
}));

jest.mock('../../utils', () => ({
  abortableTimeout: jest.fn(),
  TimeoutAbortedError: class TimeoutAbortedError extends Error {
    constructor() {
      super('Timeout aborted');
      this.name = 'TimeoutAbortedError';
    }
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processNodeStackMonitoring } = require('./process_node_stack_monitoring');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { abortableTimeout, TimeoutAbortedError } = require('../../utils');

describe('runStackMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls processNodeStackMonitoring and exits when aborted during processing', async () => {
    const monitorAbortController = new AbortController();
    const params = {} as any;
    const monitoredRuntime = {} as any;

    (processNodeStackMonitoring as jest.Mock).mockImplementation(async () => {
      monitorAbortController.abort();
    });

    await runStackMonitor(params, monitoredRuntime, monitorAbortController);
    expect(processNodeStackMonitoring).toHaveBeenCalledTimes(1);
    expect(abortableTimeout).not.toHaveBeenCalled();
  });

  it('exits when abortableTimeout throws TimeoutAbortedError', async () => {
    const monitorAbortController = new AbortController();
    const params = {} as any;
    const monitoredRuntime = {} as any;

    let callCount = 0;
    (processNodeStackMonitoring as jest.Mock).mockResolvedValue(undefined);
    (abortableTimeout as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount >= 1) {
        throw new TimeoutAbortedError();
      }
    });

    await runStackMonitor(params, monitoredRuntime, monitorAbortController);
    expect(processNodeStackMonitoring).toHaveBeenCalledTimes(1);
    expect(abortableTimeout).toHaveBeenCalledWith(500, monitorAbortController.signal);
  });

  it('propagates non-abort errors from abortableTimeout', async () => {
    const monitorAbortController = new AbortController();
    const params = {} as any;
    const monitoredRuntime = {} as any;

    (processNodeStackMonitoring as jest.Mock).mockResolvedValue(undefined);
    (abortableTimeout as jest.Mock).mockRejectedValue(new Error('unexpected'));

    await expect(runStackMonitor(params, monitoredRuntime, monitorAbortController)).rejects.toThrow(
      'unexpected'
    );
  });

  it('does not enter loop when already aborted', async () => {
    const monitorAbortController = new AbortController();
    monitorAbortController.abort();
    const params = {} as any;
    const monitoredRuntime = {} as any;

    await runStackMonitor(params, monitoredRuntime, monitorAbortController);
    expect(processNodeStackMonitoring).not.toHaveBeenCalled();
  });
});
