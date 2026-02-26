/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Project } from 'ts-morph';
import { getSourceFileMatching } from './tsmorph_utils';

describe('getSourceFileMatching', () => {
  it('returns an exact .ts match when present', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('/repo/plugin/public/index.ts', 'export const api = 1;');
    project.createSourceFile('/repo/plugin/public/index.tsx', 'export const api = 2;');

    const result = getSourceFileMatching(project, '/repo/plugin/public/index.ts');

    expect(result?.getFilePath()).toBe('/repo/plugin/public/index.ts');
  });

  it('falls back to .tsx when .ts is requested', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('/repo/plugin/public/index.tsx', 'export const api = 1;');

    const result = getSourceFileMatching(project, '/repo/plugin/public/index.ts');

    expect(result?.getFilePath()).toBe('/repo/plugin/public/index.tsx');
  });

  it('returns undefined when no matching file exists', () => {
    const project = new Project({ useInMemoryFileSystem: true });

    const result = getSourceFileMatching(project, '/repo/plugin/public/index.ts');

    expect(result).toBeUndefined();
  });
});
