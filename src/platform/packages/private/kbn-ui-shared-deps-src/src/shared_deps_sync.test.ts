/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

/**
 * entry.js and the externals map are maintained separately. A missing export
 * still builds, then plugin imports resolve to undefined at runtime.
 */
const entrySource = Fs.readFileSync(Path.resolve(__dirname, 'entry.js'), 'utf8');
const definitionsSource = Fs.readFileSync(Path.resolve(__dirname, 'definitions.js'), 'utf8');

describe('entry.js exports vs externals map', () => {
  it('exports exactly the symbols referenced by the externals map', () => {
    const exported = entryExportedSymbols(entrySource);
    const referenced = externalsReferencedSymbols(definitionsSource);

    const missingExports = [...referenced].filter((s) => !exported.has(s));
    const unreferencedExports = [...exported].filter((s) => !referenced.has(s));

    expect({ missingExports, unreferencedExports }).toEqual({
      missingExports: [],
      unreferencedExports: [],
    });
  });
});

function entryExportedSymbols(source: string): Set<string> {
  return new Set([...source.matchAll(/export const (\w+)\s*=/g)].map((m) => m[1]));
}

function externalsReferencedSymbols(source: string): Set<string> {
  return new Set([...source.matchAll(/__kbnSharedDeps__\.(\w+)/g)].map((m) => m[1]));
}
