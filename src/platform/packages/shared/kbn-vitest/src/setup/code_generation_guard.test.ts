/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The preset loads @kbn/jest's code generation guard, which exempts only Vitest's snapshot-file
// reader. Every test body runs under Vitest frames, so a broader exemption would let code under
// test generate code from strings; a renamed Vitest chunk would instead break snapshot loading.
const ERROR_MESSAGE = 'Code generation from strings disallowed for this context';

describe('code generation guard under Vitest', () => {
  it('blocks eval() from test code', () => {
    // eslint-disable-next-line no-eval -- verifying that eval is blocked
    expect(() => eval('1+1')).toThrow(ERROR_MESSAGE);
  });

  it('blocks new Function() from test code', () => {
    // eslint-disable-next-line no-new-func -- verifying that Function constructor is blocked
    expect(() => new Function('return 1+1')).toThrow(ERROR_MESSAGE);
  });

  it('still lets Vitest read snapshot files', () => {
    expect({ snapshotFileLoaded: true }).toMatchSnapshot();
  });
});
