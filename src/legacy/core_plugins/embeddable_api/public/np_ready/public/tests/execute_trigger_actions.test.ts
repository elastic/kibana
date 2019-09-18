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

import { testPlugin, TestPluginReturn } from './test_plugin';
import { of } from './helpers';
import { Action, openContextMenu, IEmbeddable } from '../lib';
import {
  ContactCardEmbeddable,
  CONTACT_USER_TRIGGER,
} from '../lib/test_samples/embeddables/contact_card/contact_card_embeddable';
import { SEND_MESSAGE_ACTION } from '../lib/test_samples/actions/send_message_action';

jest.mock('../lib/context_menu_actions');

const executeFn = jest.fn();
const openContextMenuSpy = (openContextMenu as any) as jest.SpyInstance;

class TestAction<A> extends Action<A> {
  public readonly type = 'testAction';
  public checkCompatibility: (context: A) => boolean;

  constructor(id: string, checkCompatibility: (context: A) => boolean) {
    super(id);
    this.checkCompatibility = checkCompatibility;
  }

  public getDisplayName() {
    return 'test';
  }

  async isCompatible(context: A) {
    return this.checkCompatibility(context);
  }

  async execute(context: unknown) {
    executeFn(context);
  }
}

let embeddables: TestPluginReturn;
const reset = () => {
  embeddables = testPlugin();

  embeddables.setup.registerTrigger({
    id: CONTACT_USER_TRIGGER,
    actionIds: [SEND_MESSAGE_ACTION],
  });

  executeFn.mockReset();
  openContextMenuSpy.mockReset();
};
beforeEach(reset);

test('executes a single action mapped to a trigger', async () => {
  const { setup, doStart } = embeddables;
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test1'],
  };
  const action = new TestAction('test1', () => true);
  setup.registerTrigger(trigger);
  setup.registerAction(action);

  const context = {
    embeddable: new ContactCardEmbeddable(
      { id: '123', firstName: 'Stacey', lastName: 'G' },
      { execAction: (() => null) as any }
    ),
    triggerContext: {},
  };
  const start = doStart();
  await start.executeTriggerActions('MY-TRIGGER', context);

  expect(executeFn).toBeCalledTimes(1);
  expect(executeFn).toBeCalledWith(context);
});

test('throws an error if there are no compatible actions to execute', async () => {
  const { setup, doStart } = embeddables;
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['testaction'],
  };
  setup.registerTrigger(trigger);

  const context = {
    embeddable: new ContactCardEmbeddable(
      { id: '123', firstName: 'Stacey', lastName: 'G' },
      { execAction: (() => null) as any }
    ),
    triggerContext: {},
  };
  const start = doStart();
  const [, error] = await of(start.executeTriggerActions('MY-TRIGGER', context));

  expect(error).toBeInstanceOf(Error);
  expect(error.message).toMatchInlineSnapshot(
    `"No compatible actions found to execute for trigger [triggerId = MY-TRIGGER]."`
  );
});

test('does not execute an incompatible action', async () => {
  const { setup, doStart } = embeddables;
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test1'],
  };
  const action = new TestAction<{ embeddable: IEmbeddable }>(
    'test1',
    ({ embeddable }) => embeddable.id === 'executeme'
  );
  const embeddable = new ContactCardEmbeddable(
    {
      id: 'executeme',
      firstName: 'Stacey',
      lastName: 'G',
    },
    {} as any
  );
  setup.registerTrigger(trigger);
  setup.registerAction(action);

  const start = doStart();
  const context = {
    embeddable,
    triggerContext: {},
  };
  await start.executeTriggerActions('MY-TRIGGER', context);

  expect(executeFn).toBeCalledTimes(1);
});

test('shows a context menu when more than one action is mapped to a trigger', async () => {
  const { setup, doStart } = embeddables;
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test1', 'test2'],
  };
  const action1 = new TestAction('test1', () => true);
  const action2 = new TestAction('test2', () => true);
  const embeddable = new ContactCardEmbeddable(
    {
      id: 'executeme',
      firstName: 'Stacey',
      lastName: 'G',
    },
    {} as any
  );
  setup.registerTrigger(trigger);
  setup.registerAction(action1);
  setup.registerAction(action2);

  expect(openContextMenu).toHaveBeenCalledTimes(0);

  const start = doStart();
  const context = {
    embeddable,
    triggerContext: {},
  };
  await start.executeTriggerActions('MY-TRIGGER', context);

  expect(executeFn).toBeCalledTimes(0);
  expect(openContextMenu).toHaveBeenCalledTimes(1);
});

test('passes whole action context to isCompatible()', async () => {
  const { setup, doStart } = embeddables;
  const trigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: ['test'],
  };
  const action = new TestAction<{ triggerContext: any }>('test', ({ triggerContext }) => {
    expect(triggerContext).toEqual({
      foo: 'bar',
    });
    return true;
  });

  setup.registerTrigger(trigger);
  setup.registerAction(action);
  const start = doStart();

  const context = {
    embeddable: {} as any,
    triggerContext: {
      foo: 'bar',
    },
  };
  await start.executeTriggerActions('MY-TRIGGER', context);
});
