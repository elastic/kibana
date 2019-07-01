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

import { createSetupApi } from '..';
import { of } from '../helpers';
import { ActionContext, Action, openContextMenu } from '../../lib';
import { EmbeddableSetupApi } from '../../setup';
import {
  SEND_MESSAGE_ACTION,
  CONTACT_USER_TRIGGER,
  ContactCardEmbeddable,
} from '../../lib/test_samples';

jest.mock('../../lib/context_menu_actions');

const executeFn = jest.fn();
const openContextMenuSpy = openContextMenu as any as jest.SpyInstance;

class TestAction extends Action {
  public readonly type = 'testAction';
  public checkCompatibility: (context: ActionContext) => boolean;

  constructor(id: string, checkCompatibility: (context: ActionContext) => boolean) {
    super(id);
    this.checkCompatibility = checkCompatibility;
  }

  public getDisplayName() {
    return 'test';
  }

  async isCompatible(context: ActionContext) {
    return this.checkCompatibility(context);
  }

  execute(context: ActionContext) {
    executeFn(context);
  }
}

let api: EmbeddableSetupApi;
const reset = () => {
  ({ api } = createSetupApi());

  api.registerTrigger({
    id: CONTACT_USER_TRIGGER,
    actionIds: [SEND_MESSAGE_ACTION],
  });

  executeFn.mockReset();
  openContextMenuSpy.mockReset();
};
beforeEach(reset);

test('executes a single action mapped to a trigger', async () => {
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test1'],
  };
  const action = new TestAction('test1', () => true);
  api.registerTrigger(trigger);
  api.registerAction(action);

  const context = {
    embeddable: new ContactCardEmbeddable({ id: '123', firstName: 'Stacey', lastName: 'G' }),
    triggerContext: {},
  };
  await api.executeTriggerActions('MY-TRIGGER', context);

  expect(executeFn).toBeCalledTimes(1);
  expect(executeFn).toBeCalledWith(context);
});

test('throws an error if there are no compatible actions to execute', async () => {
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['testaction'],
  };
  api.registerTrigger(trigger);

  const context = {
    embeddable: new ContactCardEmbeddable({ id: '123', firstName: 'Stacey', lastName: 'G' }),
    triggerContext: {},
  };
  const [, error] = await of(api.executeTriggerActions('MY-TRIGGER', context));

  expect(error).toBeInstanceOf(Error);
  expect(error.message).toMatchInlineSnapshot(
    `"No compatible actions found to execute for trigger [triggerId = MY-TRIGGER]."`
  );
});

test('does not execute an incompatible action', async () => {
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test1'],
  };
  const action = new TestAction('test1', ({ embeddable }) => embeddable.id === 'executeme');
  const embeddable = new ContactCardEmbeddable({ id: 'executeme', firstName: 'Stacey', lastName: 'G' });
  api.registerTrigger(trigger);
  api.registerAction(action);

  const context = {
    embeddable,
    triggerContext: {},
  };
  await api.executeTriggerActions('MY-TRIGGER', context);

  expect(executeFn).toBeCalledTimes(1);
});

test('shows a context menu when more than one action is mapped to a trigger', async () => {
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test1', 'test2'],
  };
  const action1 = new TestAction('test1', () => true);
  const action2 = new TestAction('test2', () => true);
  const embeddable = new ContactCardEmbeddable({ id: 'executeme', firstName: 'Stacey', lastName: 'G' });
  api.registerTrigger(trigger);
  api.registerAction(action1);
  api.registerAction(action2);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const context = {
    embeddable,
    triggerContext: {},
  };
  await api.executeTriggerActions('MY-TRIGGER', context);

  expect(executeFn).toBeCalledTimes(0);
  expect(openContextMenu).toHaveBeenCalledTimes(1);
});
