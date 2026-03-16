/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveTypeCheckCompiler } from './resolve_type_check_compiler';

describe('resolveTypeCheckCompiler', () => {
  it('uses the vendored TypeScript compiler by default', () => {
    expect(
      resolveTypeCheckCompiler(undefined, {
        resolveModule: jest.fn().mockReturnValue('/repo/node_modules/typescript/bin/tsc'),
      })
    ).toEqual({
      name: 'tsc',
      cmd: '/repo/node_modules/typescript/bin/tsc',
      args: [],
    });
  });

  it('uses the locally installed tsgo binary when available', () => {
    const resolveModule = jest.fn((request: string) => {
      if (request === '@typescript/native-preview/bin/tsgo.js') {
        return '/repo/node_modules/@typescript/native-preview/bin/tsgo.js';
      }

      throw new Error(`unexpected module request: ${request}`);
    });

    expect(resolveTypeCheckCompiler('tsgo', { resolveModule })).toEqual({
      name: 'tsgo',
      cmd: '/repo/node_modules/@typescript/native-preview/bin/tsgo.js',
      args: [],
    });
  });

  it('falls back to npx for tsgo when the preview package is not installed locally', () => {
    const error = Object.assign(new Error('Cannot find module'), {
      code: 'MODULE_NOT_FOUND',
    });

    expect(
      resolveTypeCheckCompiler('tsgo', {
        resolveModule: jest.fn(() => {
          throw error;
        }),
      })
    ).toEqual({
      name: 'tsgo',
      cmd: 'npx',
      args: ['-y', '@typescript/native-preview@7.0.0-dev.20260310.1'],
    });
  });

  it('rejects unsupported compiler values', () => {
    expect(() => resolveTypeCheckCompiler('swc')).toThrow(
      'Unsupported type-check compiler "swc". Expected one of: tsc, tsgo.'
    );
  });
});
