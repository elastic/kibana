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

import { expect } from 'chai';
import { replaceVars } from '../replace_vars';

describe('replaceVars(str, args, vars)', () => {
  it('replaces vars with values', () => {
    const vars = { total: 100 };
    const args = { host: 'test-01' };
    const template = '# {{args.host}} {{total}}';
    expect(replaceVars(template, args, vars)).to.equal('# test-01 100');
  });
  it('replaces args override vars', () => {
    const vars = { total: 100, args: { test: 'foo-01' } };
    const args = { test: 'bar-01' };
    const template = '# {{args.test}} {{total}}';
    expect(replaceVars(template, args, vars)).to.equal('# bar-01 100');
  });
  it('returns original string if error', () => {
    const vars = { total: 100 };
    const args = { host: 'test-01' };
    const template = '# {{args.host}} {{total';
    expect(replaceVars(template, args, vars)).to.equal('# {{args.host}} {{total');
  });
});
