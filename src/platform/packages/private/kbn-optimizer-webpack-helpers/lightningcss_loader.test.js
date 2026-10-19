/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const lightningcssLoader = require('./lightningcss_loader');

const runLoader = (source, mode) => {
  let output;
  lightningcssLoader.call(
    {
      resourcePath: 'test.css',
      mode,
      sourceMap: false,
      callback: (error, code) => {
        if (error) throw error;
        output = code;
      },
    },
    source
  );
  return output;
};

const CSS = '.a { user-select: none; composes: b from "./b.css"; }\n:global(.g) .l { color: red; }';

describe('lightningcssLoader', () => {
  it('adds vendor prefixes for the production browserslist and keeps css-modules syntax', () => {
    const output = runLoader(CSS, 'production');
    expect(output).toContain('-webkit-user-select:none');
    expect(output).toContain('composes:b from "./b.css"');
    expect(output).toContain(':global(.g) .l');
  });

  it('minifies only in production', () => {
    expect(runLoader(CSS, 'development')).toContain('\n');
    expect(runLoader(CSS, 'production')).not.toContain('\n');
  });
});
