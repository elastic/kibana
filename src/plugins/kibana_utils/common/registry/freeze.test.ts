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

import { createRegistry } from './create_registry';
import { freeze } from './freeze';

test('returns a read-only registry', () => {
  const registry = createRegistry();
  const readonly = freeze(registry);
  expect(readonly).toMatchObject({
    get: expect.any(Function),
    find: expect.any(Function),
    findBy: expect.any(Function),
    filter: expect.any(Function),
    filterBy: expect.any(Function),
    size: expect.any(Function),
    ids: expect.any(Function),
    records: expect.any(Function),
  });
});

test('removes registry mutating records', () => {
  const registry = createRegistry();
  const readonly = freeze(registry);
  expect(typeof registry.set).toBe('function');
  expect(typeof (readonly as any).set).not.toBe('function');
});

test('read-only registry is iterable', () => {
  const registry = createRegistry();
  const readonly = freeze(registry);
  expect(typeof readonly[Symbol.iterator]).toBe('function');
});
