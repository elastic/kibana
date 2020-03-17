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

import { ActionInternal, Action } from '../actions';
import { uiActionsPluginMock } from '../mocks';
import { TriggerId, ActionType } from '../types';

const action1: Action = {
  id: 'action1',
  order: 1,
  type: 'type1' as ActionType,
} as any;
const action2: Action = {
  id: 'action2',
  order: 2,
  type: 'type2' as ActionType,
} as any;

test('returns actions set on trigger', () => {
  const { setup, doStart } = uiActionsPluginMock.createPlugin();
  setup.registerAction(action1);
  setup.registerAction(action2);
  setup.registerTrigger({
    description: 'foo',
    id: 'trigger' as TriggerId,
    title: 'baz',
  });

  const start = doStart();
  const list0 = start.getTriggerActions('trigger' as TriggerId);

  expect(list0).toHaveLength(0);

  setup.addTriggerAction('trigger' as TriggerId, action1);
  const list1 = start.getTriggerActions('trigger' as TriggerId);

  expect(list1).toHaveLength(1);
  expect(list1[0]).toBeInstanceOf(ActionInternal);
  expect(list1[0].id).toBe(action1.id);

  setup.addTriggerAction('trigger' as TriggerId, action2);
  const list2 = start.getTriggerActions('trigger' as TriggerId);

  expect(list2).toHaveLength(2);
  expect(!!list2.find(({ id }: any) => id === 'action1')).toBe(true);
  expect(!!list2.find(({ id }: any) => id === 'action2')).toBe(true);
});
