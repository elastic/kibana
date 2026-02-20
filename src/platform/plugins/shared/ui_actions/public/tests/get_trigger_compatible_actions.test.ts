/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActionsPluginMock } from '../mocks';
import { createHelloWorldAction } from './test_samples';
import type { ActionDefinition } from '../actions';
import { coreMock } from '@kbn/core/public/mocks';
import {
  ADD_PANEL_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  ROW_CLICK_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '../../common/trigger_ids';

const coreStart = coreMock.createStart();
let action: ActionDefinition<{ name: string }>;
let uiActions: ReturnType<typeof uiActionsPluginMock.createPlugin>;
beforeEach(() => {
  uiActions = uiActionsPluginMock.createPlugin();
  action = {
    id: 'test',
    type: 'test',
    execute: () => Promise.resolve(),
  };

  uiActions.setup.registerAction(action as ActionDefinition);

  uiActions.setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action as ActionDefinition);
});

test('can register action', async () => {
  const { setup } = uiActions;
  const helloWorldAction = createHelloWorldAction(coreStart);

  setup.registerAction(helloWorldAction);
});

test('getTriggerCompatibleActions returns attached actions', async () => {
  const { setup, doStart } = uiActions;
  const helloWorldAction = createHelloWorldAction(coreStart);

  setup.registerAction(helloWorldAction);

  setup.addTriggerAction(VALUE_CLICK_TRIGGER, helloWorldAction);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions(VALUE_CLICK_TRIGGER, {});

  expect(actions.length).toBe(1);
  expect(actions[0].id).toBe(helloWorldAction.id);
});

test('filters out actions not applicable based on the context', async () => {
  const { setup, doStart } = uiActions;
  const action1 = {
    id: 'test1',
    type: 'test1',
    isCompatible: async (context: { accept: boolean }) => {
      return Promise.resolve(context.accept);
    },
    execute: () => Promise.resolve(),
  };

  setup.registerAction(action1);
  setup.addTriggerAction(ROW_CLICK_TRIGGER, action1);

  const start = doStart();
  let actions = await start.getTriggerCompatibleActions(ROW_CLICK_TRIGGER, { accept: true });

  expect(actions.length).toBe(1);

  actions = await start.getTriggerCompatibleActions(ROW_CLICK_TRIGGER, { accept: false });

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
  const { doStart } = uiActions;

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions(ADD_PANEL_TRIGGER, {});

  expect(actions).toEqual([]);
});
