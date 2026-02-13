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
import { ActionInternal } from '../actions';
import { uiActionsPluginMock } from '../mocks';

const action1: ActionDefinition = {
  id: 'action1',
  order: 1,
  type: 'type1',
  execute: async () => {},
};

const action2: ActionDefinition = {
  id: 'action2',
  order: 2,
  type: 'type2',
  execute: async () => {},
};

test('returns actions set on trigger', async () => {
  const { setup, doStart } = uiActionsPluginMock.createPlugin();
  setup.registerAction(action1);
  setup.registerAction(action2);

  const start = doStart();
  const list0 = await start.getTriggerActions(CONTEXT_MENU_TRIGGER);

  expect(list0).toHaveLength(0);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action1);
  const list1 = await start.getTriggerActions(CONTEXT_MENU_TRIGGER);

  expect(list1).toHaveLength(1);
  expect(list1[0]).toBeInstanceOf(ActionInternal);
  expect(list1[0].id).toBe(action1.id);

  setup.addTriggerAction(CONTEXT_MENU_TRIGGER, action2);
  const list2 = await start.getTriggerActions(CONTEXT_MENU_TRIGGER);

  expect(list2).toHaveLength(2);
  expect(!!list2.find(({ id }: { id: string }) => id === 'action1')).toBe(true);
  expect(!!list2.find(({ id }: { id: string }) => id === 'action2')).toBe(true);
});
