/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type agent from 'elastic-apm-node';
import { withTraceParent } from './apm_internal';

describe('withTraceParent', () => {
  const traceParent = '00-abc123-spanid-01';

  it('runs without a wrapper when traceParent is undefined', async () => {
    const apm = {
      currentTraceparent: traceParent,
      startTransaction: jest.fn(),
    } as unknown as typeof agent;
    const run = jest.fn().mockResolvedValue('ok');

    await expect(withTraceParent(apm, undefined, run)).resolves.toBe('ok');

    expect(run).toHaveBeenCalledTimes(1);
    expect(apm.startTransaction).not.toHaveBeenCalled();
  });

  it('skips the wrapper when the active traceparent already matches', async () => {
    const apm = {
      currentTraceparent: traceParent,
      startTransaction: jest.fn(),
    } as unknown as typeof agent;
    const run = jest.fn().mockResolvedValue('scheduled');

    await expect(withTraceParent(apm, traceParent, run)).resolves.toBe('scheduled');

    expect(run).toHaveBeenCalledTimes(1);
    expect(apm.startTransaction).not.toHaveBeenCalled();
  });

  it('opens a wrapper transaction when replaying a stored traceparent', async () => {
    const end = jest.fn();
    const transaction = { end, outcome: 'unknown' };
    const apm = {
      currentTraceparent: '00-current-context-01',
      startTransaction: jest.fn().mockReturnValue(transaction),
    } as unknown as typeof agent;
    const run = jest.fn().mockResolvedValue('scheduled');

    await expect(
      withTraceParent(apm, traceParent, run, { transactionName: 'workflow resume schedule' })
    ).resolves.toBe('scheduled');

    expect(apm.startTransaction).toHaveBeenCalledWith('workflow resume schedule', 'workflow', {
      childOf: traceParent,
    });
    expect(transaction.outcome).toBe('success');
    expect(end).toHaveBeenCalled();
  });
});
