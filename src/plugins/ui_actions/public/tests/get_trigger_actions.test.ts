/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
