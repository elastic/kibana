/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import requireInteropLoader from './require_interop_loader';

const transform = (source: string) => requireInteropLoader.call({} as any, source);

describe('requireInteropLoader', () => {
  it('returns source unchanged when there are no require() calls', () => {
    const source = 'const x = 42;\nexport default x;';
    expect(transform(source)).toBe(source);
  });

  it('wraps a require() call with __kbnInteropDefault', () => {
    const source = `const foo = require('lodash');`;
    const result = transform(source);
    expect(result).toContain(`__kbnInteropDefault(require('lodash'))`);
  });

  it('prepends the __kbnInteropDefault helper', () => {
    const source = `const foo = require('lodash');`;
    const result = transform(source);
    expect(result).toContain('function __kbnInteropDefault(m)');
  });

  it('prepends the helper only once for multiple require calls', () => {
    const source = `const a = require('lodash');\nconst b = require('rxjs');`;
    const result = transform(source);
    const helperCount = (result.match(/__kbnInteropDefault\(m\)/g) || []).length;
    expect(helperCount).toBe(1);
  });

  it('does not wrap relative imports', () => {
    const source = `const foo = require('./local');`;
    expect(transform(source)).toBe(source);
  });

  it('does not wrap node: prefixed imports', () => {
    const source = `const fs = require('node:fs');`;
    expect(transform(source)).toBe(source);
  });

  it('does not wrap Node.js built-in modules', () => {
    const builtins = ['fs', 'path', 'os', 'crypto', 'util', 'events', 'stream', 'buffer'];
    for (const builtin of builtins) {
      const source = `const mod = require('${builtin}');`;
      expect(transform(source)).toBe(source);
    }
  });

  it('does not duplicate helper when source already contains __kbnInteropDefault', () => {
    const source = `function __kbnInteropDefault(m) { return m; }\nconst foo = require('lodash');`;
    const result = transform(source);
    const helperDecls = (result.match(/function __kbnInteropDefault/g) || []).length;
    expect(helperDecls).toBe(1);
  });

  it('works with let keyword', () => {
    const source = `let foo = require('lodash');`;
    const result = transform(source);
    expect(result).toContain(`let foo = __kbnInteropDefault(require('lodash'))`);
  });

  it('works with var keyword', () => {
    const source = `var foo = require('lodash');`;
    const result = transform(source);
    expect(result).toContain(`var foo = __kbnInteropDefault(require('lodash'))`);
  });
});
