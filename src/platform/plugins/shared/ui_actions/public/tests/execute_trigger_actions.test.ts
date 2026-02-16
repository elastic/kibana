/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CONTEXT_MENU_TRIGGER } from '../../common/trigger_ids';
import type { ActionDefinition } from '../actions';
import { openContextMenu } from '../context_menu';
import { uiActionsPluginMock } from '../mocks';
import { waitFor } from '@testing-library/react';

jest.mock('../context_menu');

const executeFn = jest.fn();
const openContextMenuSpy = openContextMenu as unknown as jest.SpyInstance;

function createTestAction<C extends object>(
  type: string,
  checkCompatibility: (context: C) => boolean,
  autoExecutable = false
): ActionDefinition {
  return {
    type,
    id: type,
    isCompatible: (context: C) => Promise.resolve(checkCompatibility(context)),
    execute: (context) => executeFn(context),
    shouldAutoExecute: () => Promise.resolve(autoExecutable),
  };
}

let uiActions: ReturnType<typeof uiActionsPluginMock.createPlugin>;
const reset = () => {
  uiActions = uiActionsPluginMock.createPlugin();

  executeFn.mockReset();
  openContextMenuSpy.mockReset();
  jest.useFakeTimers({ legacyFakeTimers: true });
};
beforeEach(reset);

test('executes a single action mapped to a trigger', async () => {
  const { setup, doStart } = uiActions;
  const action = createTestAction('test1', () => true);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

  const context = {};
  const start = doStart();
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context);

  jest.runAllTimers();

  expect(executeFn).toBeCalledTimes(1);
  expect(executeFn).toBeCalledWith(expect.objectContaining(context));
});

test("doesn't throw an error if there are no compatible actions to execute", async () => {
  const { doStart } = uiActions;

  const context = {};
  const start = doStart();
  await expect(start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context)).resolves.toBeUndefined();
});

test('does not execute an incompatible action', async () => {
  const { setup, doStart } = uiActions;

  const action = createTestAction<{ name: string }>(
    'test1',
    ({ name }: { name: string }) => name === 'executeme'
  );

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

  const start = doStart();
  const context = {
    name: 'executeme',
  };
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context);

  jest.runAllTimers();

  expect(executeFn).toBeCalledTimes(1);
});

test('shows a context menu when more than one action is mapped to a trigger', async () => {
  const { setup, doStart } = uiActions;

  const action1 = createTestAction('test1', () => true);
  const action2 = createTestAction('test2', () => true);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action1);
  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action2);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {};
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context);

  jest.runAllTimers();

  await waitFor(() => {
    expect(executeFn).toBeCalledTimes(0);
    expect(openContextMenu).toHaveBeenCalledTimes(1);
  });
});

test('shows a context menu when there is only one action mapped to a trigger and "alwaysShowPopup" is set', async () => {
  const { setup, doStart } = uiActions;

  const action1 = createTestAction('test1', () => true);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action1);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {};
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context, true);

  jest.runAllTimers();

  await waitFor(() => {
    expect(executeFn).toBeCalledTimes(0);
    expect(openContextMenu).toHaveBeenCalledTimes(1);
  });
});

test('passes whole action context to isCompatible()', async () => {
  const { setup, doStart } = uiActions;

  const action = createTestAction<{ foo: string }>('test', ({ foo }) => {
    expect(foo).toEqual('bar');
    return true;
  });

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

  const start = doStart();

  const context = { foo: 'bar' };
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context);
  jest.runAllTimers();
});

test("doesn't show a context menu for auto executable actions", async () => {
  const { setup, doStart } = uiActions;

  const action1 = createTestAction('test1', () => true, true);
  const action2 = createTestAction('test2', () => true, false);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action1);
  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action2);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {};
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context);

  jest.runAllTimers();

  await waitFor(() => {
    expect(executeFn).toBeCalledTimes(2);
    expect(openContextMenu).toHaveBeenCalledTimes(0);
  });
});

test('passes trigger into execute', async () => {
  const { setup, doStart } = uiActions;

  const action = createTestAction<{ foo: string }>('test', () => true);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

  const start = doStart();

  const context = { foo: 'bar' };
  await start.executeTriggerActions(CONTEXT_MENU_TRIGGER, context);
  jest.runAllTimers();
  expect(executeFn).toBeCalledWith({
    ...context,
    trigger: start.getTrigger(CONTEXT_MENU_TRIGGER),
  });
});
