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

import { Action, createAction } from '../actions';
import { openContextMenu } from '../context_menu';
import { uiActionsPluginMock } from '../mocks';
import { Trigger } from '../triggers';
import { TriggerId, ActionType } from '../types';

jest.mock('../context_menu');

const executeFn = jest.fn();
const openContextMenuSpy = (openContextMenu as any) as jest.SpyInstance;

const CONTACT_USER_TRIGGER = 'CONTACT_USER_TRIGGER';

// Casting to ActionType is a hack - in a real situation use
// declare module and add this id to ActionContextMapping.
const TEST_ACTION_TYPE = 'TEST_ACTION_TYPE' as ActionType;

function createTestAction<C extends object>(
  type: string,
  checkCompatibility: (context: C) => boolean
): Action<object> {
  return createAction<typeof TEST_ACTION_TYPE>({
    type: type as ActionType,
    id: type,
    isCompatible: (context: C) => Promise.resolve(checkCompatibility(context)),
    execute: (context) => executeFn(context),
  });
}

let uiActions: ReturnType<typeof uiActionsPluginMock.createPlugin>;
const reset = () => {
  uiActions = uiActionsPluginMock.createPlugin();

  uiActions.setup.registerTrigger({
    id: CONTACT_USER_TRIGGER,
  });
  // uiActions.setup.attachAction(CONTACT_USER_TRIGGER, 'ACTION_SEND_MESSAGE');

  executeFn.mockReset();
  openContextMenuSpy.mockReset();
};
beforeEach(reset);

test('executes a single action mapped to a trigger', async () => {
  const { setup, doStart } = uiActions;
  const trigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action = createTestAction('test1', () => true);

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action);

  const context = {};
  const start = doStart();
  await start.executeTriggerActions('MY-TRIGGER' as TriggerId, context);

  expect(executeFn).toBeCalledTimes(1);
  expect(executeFn).toBeCalledWith(context);
});

test('throws an error if there are no compatible actions to execute', async () => {
  const { setup, doStart } = uiActions;
  const trigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };

  setup.registerTrigger(trigger);

  const context = {};
  const start = doStart();
  await expect(
    start.executeTriggerActions('MY-TRIGGER' as TriggerId, context)
  ).rejects.toMatchObject(
    new Error('No compatible actions found to execute for trigger [triggerId = MY-TRIGGER].')
  );
});

test('does not execute an incompatible action', async () => {
  const { setup, doStart } = uiActions;
  const trigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action = createTestAction<{ name: string }>(
    'test1',
    ({ name }: { name: string }) => name === 'executeme'
  );

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action);

  const start = doStart();
  const context = {
    name: 'executeme',
  };
  await start.executeTriggerActions('MY-TRIGGER' as TriggerId, context);

  expect(executeFn).toBeCalledTimes(1);
});

test('shows a context menu when more than one action is mapped to a trigger', async () => {
  const { setup, doStart } = uiActions;
  const trigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action1 = createTestAction('test1', () => true);
  const action2 = createTestAction('test2', () => true);

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action1);
  setup.addTriggerAction(trigger.id, action2);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {};
  await start.executeTriggerActions('MY-TRIGGER' as TriggerId, context);

  expect(executeFn).toBeCalledTimes(0);
  expect(openContextMenu).toHaveBeenCalledTimes(1);
});

test('passes whole action context to isCompatible()', async () => {
  const { setup, doStart } = uiActions;
  const trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action = createTestAction<{ foo: string }>('test', ({ foo }) => {
    expect(foo).toEqual('bar');
    return true;
  });

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action);

  const start = doStart();

  const context = { foo: 'bar' };
  await start.executeTriggerActions('MY-TRIGGER' as TriggerId, context);
});
