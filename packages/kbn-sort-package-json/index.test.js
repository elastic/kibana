/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortPackageJson } from '.';

const sortedKeys = (json, field) => {
  const sorted = JSON.parse(sortPackageJson(json));
  return Object.keys(field ? sorted[field] : sorted);
};

describe('sortPackageJson', () => {
  it('orders top level keys: known keys first, then unknown alphabetically, then private keys', () => {
    expect(
      sortedKeys({
        _private: 1,
        zeta: 1,
        devDependencies: {},
        alpha: 1,
        sideEffects: false,
        license: 'x',
        version: '1.0.0',
        private: true,
        name: 'x',
      })
    ).toEqual([
      'name',
      'private',
      'version',
      'license',
      'sideEffects',
      'devDependencies',
      'alpha',
      'zeta',
      '_private',
    ]);
  });

  it('sorts dependency maps by code units', () => {
    expect(
      sortedKeys({ dependencies: { b: '1', B: '1', '@a/b': '1', a: '1' } }, 'dependencies')
    ).toEqual(['@a/b', 'B', 'a', 'b']);
  });

  it('sorts scripts by ":" segments and groups pre/post hooks with their script', () => {
    const scripts = Object.fromEntries(
      [
        'build-x',
        'build:b',
        'postbuild',
        'build',
        'prebuild',
        'preinstall',
        'prettier',
        'lint',
      ].map((name) => [name, ''])
    );
    expect(sortedKeys({ scripts }, 'scripts')).toEqual([
      'prebuild',
      'build',
      'postbuild',
      'build:b',
      'build-x',
      'preinstall',
      'lint',
      'prettier',
    ]);
  });

  it('moves subpaths first and the default condition last in exports', () => {
    const { exports } = JSON.parse(
      sortPackageJson({
        exports: {
          default: './d.js',
          import: './i.js',
          './sub': { default: './s.js', require: './s.cjs' },
        },
      })
    );
    expect(Object.keys(exports)).toEqual(['./sub', 'import', 'default']);
    expect(Object.keys(exports['./sub'])).toEqual(['require', 'default']);
  });

  it('serializes with 2 space indentation, accepting strings', () => {
    expect(sortPackageJson('{"version":"1","name":"x"}')).toBe(
      '{\n  "name": "x",\n  "version": "1"\n}'
    );
  });
});
