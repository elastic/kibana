/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { dependenciesVisitorsGenerator } from './visitors';

const visitorsApplier = (code) => {
  const result = [];
  traverse(
    parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['exportDefaultFrom'],
    }),
    dependenciesVisitorsGenerator(result)
  );
  return result;
};

describe('Code Parser Visitors', () => {
  it('should get values from require', () => {
    const rawCode = `/*foo*/require('dep1'); const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
  });

  it('should get values from require.resolve', () => {
    const rawCode = `/*foo*/require.resolve('dep2'); const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep2');
  });

  it('should get values from import', () => {
    const rawCode = `/*foo*/import dep1 from 'dep1'; import dep2 from 'dep2';const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
    expect(foundDeps[1] === 'dep2');
  });

  it('should get values from export from', () => {
    const rawCode = `/*foo*/export dep1 from 'dep1'; import dep2 from 'dep2';const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
  });

  it('should get values from export * from', () => {
    const rawCode = `/*foo*/export * from 'dep1'; export dep2 from 'dep2';const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
    expect(foundDeps[1] === 'dep2');
  });
});
