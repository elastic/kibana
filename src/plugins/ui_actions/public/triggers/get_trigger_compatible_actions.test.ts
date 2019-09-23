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

import { createSayHelloAction } from '../tests/test_samples/say_hello_action';
import { IUiActionsTestPluginReturn, uiActionsTestPlugin } from '../tests/test_plugin';
import { createRestrictedAction, createHelloWorldAction } from '../tests/test_samples';
import { IAction } from '../actions';

let action: IAction<{ name: string }>;
let uiActions: IUiActionsTestPluginReturn;
beforeEach(() => {
  uiActions = uiActionsTestPlugin();
  action = createSayHelloAction({} as any);

  uiActions.setup.registerAction(action);
  uiActions.setup.registerTrigger({
    id: 'trigger',
    title: 'trigger',
    actionIds: [],
  });
  uiActions.setup.attachAction('trigger', action.id);
});

test('can register and get actions', async () => {
  const { setup, plugin } = uiActions;
  const helloWorldAction = createHelloWorldAction({} as any);
  const length = (plugin as any).actions.size;

  setup.registerAction(helloWorldAction);

  expect((plugin as any).actions.size - length).toBe(1);
  expect((plugin as any).actions.get(action.id)).toBe(action);
  expect((plugin as any).actions.get(helloWorldAction.id)).toBe(helloWorldAction);
});

test('getTriggerCompatibleActions returns attached actions', async () => {
  const { setup, doStart } = uiActions;
  const helloWorldAction = createHelloWorldAction({} as any);

  setup.registerAction(helloWorldAction);

  const testTrigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: [],
  };
  setup.registerTrigger(testTrigger);
  setup.attachAction('MY-TRIGGER', helloWorldAction.id);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions('MY-TRIGGER', {});

  expect(actions.length).toBe(1);
  expect(actions[0].id).toBe(helloWorldAction.id);
});

test('filters out actions not applicable based on the context', async () => {
  const { setup, doStart } = uiActions;
  const restrictedAction = createRestrictedAction<{ accept: boolean }>(context => {
    return context.accept;
  });

  setup.registerAction(restrictedAction);

  const testTrigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: [restrictedAction.id],
  };

  setup.registerTrigger(testTrigger);

  const start = doStart();
  let actions = await start.getTriggerCompatibleActions(testTrigger.id, { accept: true });

  expect(actions.length).toBe(1);

  actions = await start.getTriggerCompatibleActions(testTrigger.id, { accept: false });

  expect(actions.length).toBe(0);
});

test(`throws an error with an invalid trigger ID`, async () => {
  const { doStart } = uiActions;
  const start = doStart();

  await expect(start.getTriggerCompatibleActions('I do not exist', {})).rejects.toMatchObject(
    new Error('Trigger [triggerId = I do not exist] does not exist.')
  );
});

test(`with a trigger mapping that maps to an non-existing action returns empty list`, async () => {
  const { setup, doStart } = uiActions;
  const testTrigger = {
    id: '123',
    title: '123',
    actionIds: ['I do not exist'],
  };
  setup.registerTrigger(testTrigger);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions(testTrigger.id, {});

  expect(actions).toEqual([]);
});
