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

import expect from 'expect.js';
import { metadata } from '../metadata';
describe('ui/metadata', () => {


  it('is same data as window.__KBN__', () => {
    expect(metadata.version).to.equal(window.__KBN__.version);
    expect(metadata.vars.kbnIndex).to.equal(window.__KBN__.vars.kbnIndex);
  });

  it('is immutable', () => {
    expect(() => metadata.foo = 'something').to.throw;
    expect(() => metadata.version = 'something').to.throw;
    expect(() => metadata.vars = {}).to.throw;
    expect(() => metadata.vars.kbnIndex = 'something').to.throw;
  });
});
