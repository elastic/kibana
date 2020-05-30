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

import { uiActionsPluginMock } from '../mocks';
import { createHelloWorldAction } from '../tests/test_samples';
import { Action, createAction } from '../actions';
import { Trigger } from '../triggers';
import { TriggerId, ActionType } from '../types';

let action: Action<{ name: string }, ActionType>;
let uiActions: ReturnType<typeof uiActionsPluginMock.createPlugin>;
beforeEach(() => {
  uiActions = uiActionsPluginMock.createPlugin();
  action = createAction({
    type: 'test' as ActionType,
    execute: () => Promise.resolve(),
  });

  uiActions.setup.registerAction(action);
  uiActions.setup.registerTrigger({
    id: 'trigger' as TriggerId,
    title: 'trigger',
  });
  uiActions.setup.addTriggerAction('trigger' as TriggerId, action);
});

test('can register action', async () => {
  const { setup } = uiActions;
  const helloWorldAction = createHelloWorldAction({} as any);

  setup.registerAction(helloWorldAction);
});

test('getTriggerCompatibleActions returns attached actions', async () => {
  const { setup, doStart } = uiActions;
  const helloWorldAction = createHelloWorldAction({} as any);

  setup.registerAction(helloWorldAction);

  const testTrigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  setup.registerTrigger(testTrigger);
  setup.addTriggerAction('MY-TRIGGER' as TriggerId, helloWorldAction);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions('MY-TRIGGER' as TriggerId, {});

  expect(actions.length).toBe(1);
  expect(actions[0].id).toBe(helloWorldAction.id);
});

test('filters out actions not applicable based on the context', async () => {
  const { setup, doStart } = uiActions;
  const action1 = createAction({
    type: 'test1' as ActionType,
    isCompatible: async (context: { accept: boolean }) => {
      return Promise.resolve(context.accept);
    },
    execute: () => Promise.resolve(),
  });

  const testTrigger: Trigger = {
    id: 'MY-TRIGGER2' as TriggerId,
    title: 'My trigger',
  };

  setup.registerTrigger(testTrigger);
  setup.registerAction(action1);
  setup.addTriggerAction(testTrigger.id, action1);

  const start = doStart();
  let actions = await start.getTriggerCompatibleActions(testTrigger.id, { accept: true });

  expect(actions.length).toBe(1);

  actions = await start.getTriggerCompatibleActions(testTrigger.id, { accept: false });

  expect(actions.length).toBe(0);
});

test(`throws an error with an invalid trigger ID`, async () => {
  const { doStart } = uiActions;
  const start = doStart();

  await expect(
    start.getTriggerCompatibleActions('I do not exist' as TriggerId, {})
  ).rejects.toMatchObject(new Error('Trigger [triggerId = I do not exist] does not exist.'));
});

test(`with a trigger mapping that maps to an non-existing action returns empty list`, async () => {
  const { setup, doStart } = uiActions;
  const testTrigger: Trigger = {
    id: '123' as TriggerId,
    title: '123',
  };
  setup.registerTrigger(testTrigger);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions(testTrigger.id, {});

  expect(actions).toEqual([]);
});
