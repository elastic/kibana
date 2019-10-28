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

import { createApi } from '../api';
import { createDeps } from '../tests/helpers';

test('can get Trigger from registry', () => {
  const deps = createDeps();
  const { api } = createApi(deps);
  api.registerTrigger({
    actionIds: [],
    description: 'foo',
    id: 'bar',
    title: 'baz',
  });

  const trigger = api.getTrigger('bar');

  expect(trigger).toEqual({
    actionIds: [],
    description: 'foo',
    id: 'bar',
    title: 'baz',
  });
});

test('throws if trigger does not exist', () => {
  const deps = createDeps();
  const { api } = createApi(deps);

  expect(() => api.getTrigger('foo')).toThrowError('Trigger [triggerId = foo] does not exist.');
});
