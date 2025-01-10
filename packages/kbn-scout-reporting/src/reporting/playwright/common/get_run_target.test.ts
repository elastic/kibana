/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRunTarget } from './get_run_target';

describe('getRunTarget', () => {
  it(`should return the correct mode for '--grep=@svlSearch'`, () => {
    const argv = [
      'node',
      'scripts/scout.js',
      'run-tests',
      '--config',
      'path/to/config',
      '--grep=@svlSearch',
    ];
    expect(getRunTarget(argv)).toBe('serverless-search');
  });

  it(`should return the correct mode for '--grep @svlSearch'`, () => {
    const argv = [
      'node',
      'scripts/scout.js',
      'run-tests',
      '--config',
      'path/to/config',
      '--grep',
      '@svlSearch',
    ];
    expect(getRunTarget(argv)).toBe('serverless-search');
  });

  it(`should return 'undefined' for an invalid --grep tag`, () => {
    const argv = [
      'node',
      'scripts/scout.js',
      'run-tests',
      '--config',
      'path/to/config',
      '--grep=@invalidTag',
    ];
    expect(getRunTarget(argv)).toBe('undefined');
  });

  it(`should return 'undefined' if --grep argument is not provided`, () => {
    const argv = ['node', 'scripts/scout.js'];
    expect(getRunTarget(argv)).toBe('undefined');
  });

  it(`should return 'undefined' for '--grep='`, () => {
    const argv = ['node', 'scripts/scout.js', '--grep='];
    expect(getRunTarget(argv)).toBe('undefined');
  });

  it(`should return 'undefined' if '--grep' argument is without value`, () => {
    const argv = ['node', 'scripts/scout.js', '--grep'];
    expect(getRunTarget(argv)).toBe('undefined');
  });
});
