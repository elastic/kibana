/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, createAction } from '../actions';
import { openContextMenu } from '../context_menu';
import { uiActionsPluginMock } from '../mocks';
import { Trigger } from '../triggers';
import { TriggerId, ActionType } from '../types';
import { waitFor } from '@testing-library/dom';

jest.mock('../context_menu');

const executeFn = jest.fn();
const openContextMenuSpy = (openContextMenu as any) as jest.SpyInstance;

const CONTACT_USER_TRIGGER = 'CONTACT_USER_TRIGGER';

// Casting to ActionType is a hack - in a real situation use
// declare module and add this id to ActionContextMapping.
const TEST_ACTION_TYPE = 'TEST_ACTION_TYPE' as ActionType;

function createTestAction<C extends object>(
  type: string,
  checkCompatibility: (context: C) => boolean,
  autoExecutable = false
): Action<object> {
  return createAction<typeof TEST_ACTION_TYPE>({
    type: type as ActionType,
    id: type,
    isCompatible: (context: C) => Promise.resolve(checkCompatibility(context)),
    execute: (context) => executeFn(context),
    shouldAutoExecute: () => Promise.resolve(autoExecutable),
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
  jest.useFakeTimers();
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

  jest.runAllTimers();

  expect(executeFn).toBeCalledTimes(1);
  expect(executeFn).toBeCalledWith(expect.objectContaining(context));
});

test("doesn't throw an error if there are no compatible actions to execute", async () => {
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
  ).resolves.toBeUndefined();
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

  jest.runAllTimers();

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
  await start.getTrigger('MY-TRIGGER' as TriggerId)!.exec(context);

  jest.runAllTimers();

  await waitFor(() => {
    expect(executeFn).toBeCalledTimes(0);
    expect(openContextMenu).toHaveBeenCalledTimes(1);
  });
});

test('shows a context menu when there is only one action mapped to a trigger and "alwaysShowPopup" is set', async () => {
  const { setup, doStart } = uiActions;
  const trigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action1 = createTestAction('test1', () => true);

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action1);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {};
  await start.getTrigger('MY-TRIGGER' as TriggerId)!.exec(context, true);

  jest.runAllTimers();

  await waitFor(() => {
    expect(executeFn).toBeCalledTimes(0);
    expect(openContextMenu).toHaveBeenCalledTimes(1);
  });
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
  jest.runAllTimers();
});

test("doesn't show a context menu for auto executable actions", async () => {
  const { setup, doStart } = uiActions;
  const trigger: Trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action1 = createTestAction('test1', () => true, true);
  const action2 = createTestAction('test2', () => true, false);

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action1);
  setup.addTriggerAction(trigger.id, action2);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {};
  await start.executeTriggerActions('MY-TRIGGER' as TriggerId, context);

  jest.runAllTimers();

  await waitFor(() => {
    expect(executeFn).toBeCalledTimes(2);
    expect(openContextMenu).toHaveBeenCalledTimes(0);
  });
});

test('passes trigger into execute', async () => {
  const { setup, doStart } = uiActions;
  const trigger = {
    id: 'MY-TRIGGER' as TriggerId,
    title: 'My trigger',
  };
  const action = createTestAction<{ foo: string }>('test', () => true);

  setup.registerTrigger(trigger);
  setup.addTriggerAction(trigger.id, action);

  const start = doStart();

  const context = { foo: 'bar' };
  await start.executeTriggerActions('MY-TRIGGER' as TriggerId, context);
  jest.runAllTimers();
  expect(executeFn).toBeCalledWith({
    ...context,
    trigger,
  });
});
