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

import { createSetupApi } from '..';
import { Action } from '../../lib';

const action1 = {
  id: 'action1',
  order: 1,
  type: 'type1',
} as any as Action;
const action2 = {
  id: 'action2',
  order: 2,
  type: 'type2',
} as any as Action;

test('returns actions set on trigger', () => {
  const [api] = createSetupApi();
  api.registerAction(action1);
  api.registerAction(action2);
  api.registerTrigger({
    actionIds: [],
    description: 'foo',
    id: 'trigger',
    title: 'baz',
  });

  const list0 = api.getTriggerActions('trigger');

  expect(list0).toHaveLength(0);

  api.attachAction('trigger', 'action1');
  const list1 = api.getTriggerActions('trigger');
  
  expect(list1).toHaveLength(1);
  expect(list1).toEqual([action1]);

  api.attachAction('trigger', 'action2');
  const list2 = api.getTriggerActions('trigger');
  
  expect(list2).toHaveLength(2);
  expect(!!list2.find(({id}: any) => id === 'action1')).toBe(true);
  expect(!!list2.find(({id}: any) => id === 'action2')).toBe(true);
});
