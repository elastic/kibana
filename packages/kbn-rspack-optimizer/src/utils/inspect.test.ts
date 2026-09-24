/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInspectExecArgv, resetInspectState } from './inspect';

describe('getInspectExecArgv', () => {
  const origExecArgv = process.execArgv;

  afterEach(() => {
    process.execArgv = origExecArgv;
    resetInspectState();
  });

  it('returns empty array when parent has no inspect flags', () => {
    process.execArgv = [];
    expect(getInspectExecArgv(true)).toEqual([]);
  });

  it('returns empty array when inspectWorkers is false', () => {
    process.execArgv = ['--inspect=9229'];
    expect(getInspectExecArgv(false)).toEqual([]);
  });

  it('returns --inspect with incremented port when parent has --inspect=port', () => {
    process.execArgv = ['--inspect=9229'];
    expect(getInspectExecArgv(true)).toEqual(['--inspect=9230']);
  });

  it('returns --inspect-brk with incremented port when parent has --inspect-brk=port', () => {
    process.execArgv = ['--inspect-brk=9229'];
    expect(getInspectExecArgv(true)).toEqual(['--inspect-brk=9230']);
  });

  it('defaults to port 9230 when parent has --inspect without port', () => {
    process.execArgv = ['--inspect'];
    expect(getInspectExecArgv(true)).toEqual(['--inspect=9230']);
  });

  it('auto-increments port on multiple calls', () => {
    process.execArgv = ['--inspect=9229'];
    expect(getInspectExecArgv(true)).toEqual(['--inspect=9230']);
    expect(getInspectExecArgv(true)).toEqual(['--inspect=9231']);
    expect(getInspectExecArgv(true)).toEqual(['--inspect=9232']);
  });

  it('returns empty array when inspectWorkers is false regardless of parent flags', () => {
    process.execArgv = ['--inspect-brk=5000'];
    expect(getInspectExecArgv(false)).toEqual([]);
  });
});
