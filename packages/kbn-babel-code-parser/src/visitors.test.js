/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
