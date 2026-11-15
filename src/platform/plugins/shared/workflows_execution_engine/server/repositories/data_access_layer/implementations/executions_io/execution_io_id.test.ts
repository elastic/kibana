/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { executionIoId, parseExecutionIoId } from './execution_io_id';

describe('execution IO ids', () => {
  it('round-trips step and workflow ids', () => {
    expect(parseExecutionIoId(executionIoId('output', 'step-1'))).toEqual({
      type: 'output',
      executionId: 'step-1',
    });
    expect(parseExecutionIoId(executionIoId('input', 'run-1'))).toEqual({
      type: 'input',
      executionId: 'run-1',
    });
  });

  it('rejects an id without an execution id', () => {
    expect(parseExecutionIoId('input:')).toBeUndefined();
    expect(parseExecutionIoId('other:step-1')).toBeUndefined();
  });
});
