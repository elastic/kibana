/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uiActionsPluginMock } from '../mocks';
import { createHelloWorldAction } from './test_samples';
import { Action, createAction } from '../actions';
import { Trigger } from '../triggers';
import { OverlayStart } from '@kbn/core/public';

let action: Action<{ name: string }>;
let uiActions: ReturnType<typeof uiActionsPluginMock.createPlugin>;
beforeEach(() => {
  uiActions = uiActionsPluginMock.createPlugin();
  action = createAction({
    id: 'test',
    type: 'test',
    execute: () => Promise.resolve(),
  });

  uiActions.setup.registerAction(action);
  uiActions.setup.registerTrigger({
    id: 'trigger',
    title: 'trigger',
  });
  uiActions.setup.addTriggerAction('trigger', action);
});

test('can register action', async () => {
  const { setup } = uiActions;
  const helloWorldAction = createHelloWorldAction({} as unknown as OverlayStart);

  setup.registerAction(helloWorldAction);
});

test('getTriggerCompatibleActions returns attached actions', async () => {
  const { setup, doStart } = uiActions;
  const helloWorldAction = createHelloWorldAction({} as unknown as OverlayStart);

  setup.registerAction(helloWorldAction);

  const testTrigger: Trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
  };
  setup.registerTrigger(testTrigger);
  setup.addTriggerAction('MY-TRIGGER', helloWorldAction);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions('MY-TRIGGER', {});

  expect(actions.length).toBe(1);
  expect(actions[0].id).toBe(helloWorldAction.id);
});

test('filters out actions not applicable based on the context', async () => {
  const { setup, doStart } = uiActions;
  const action1 = createAction({
    id: 'test1',
    type: 'test1',
    isCompatible: async (context: { accept: boolean }) => {
      return Promise.resolve(context.accept);
    },
    execute: () => Promise.resolve(),
  });

  const testTrigger: Trigger = {
    id: 'MY-TRIGGER2',
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

  await expect(start.getTriggerCompatibleActions('I do not exist', {})).rejects.toMatchObject(
    new Error('Trigger [triggerId = I do not exist] does not exist.')
  );
});

test(`with a trigger mapping that maps to an non-existing action returns empty list`, async () => {
  const { setup, doStart } = uiActions;
  const testTrigger: Trigger = {
    id: '123',
    title: '123',
  };
  setup.registerTrigger(testTrigger);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions(testTrigger.id, {});

  expect(actions).toEqual([]);
});
