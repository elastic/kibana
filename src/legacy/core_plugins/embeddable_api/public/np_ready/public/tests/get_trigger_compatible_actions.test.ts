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
import { HelloWorldAction } from '../lib/test_samples/actions/hello_world_action';
import { SayHelloAction } from '../lib/test_samples/actions/say_hello_action';
import { RestrictedAction } from '../lib/test_samples/actions/restricted_action';
import { EmptyEmbeddable } from '../lib/test_samples/embeddables/empty_embeddable';
import { CONTEXT_MENU_TRIGGER, IEmbeddable } from '../lib';
import { of } from './helpers';

let action: SayHelloAction;
let embeddables: TestPluginReturn;
beforeEach(() => {
  embeddables = testPlugin();
  action = new SayHelloAction(() => {});

  embeddables.setup.registerAction(action);
  embeddables.setup.attachAction(CONTEXT_MENU_TRIGGER, action.id);
});

test('can register and get actions', async () => {
  const { setup, plugin } = embeddables;
  const helloWorldAction = new HelloWorldAction({} as any);
  const length = (plugin as any).actions.size;

  setup.registerAction(helloWorldAction);

  expect((plugin as any).actions.size - length).toBe(1);
  expect((plugin as any).actions.get(action.id)).toBe(action);
  expect((plugin as any).actions.get(helloWorldAction.id)).toBe(helloWorldAction);
});

test('getTriggerCompatibleActions returns attached actions', async () => {
  const { setup, doStart } = embeddables;
  const embeddable = new EmptyEmbeddable({ id: '123' });
  const helloWorldAction = new HelloWorldAction({} as any);

  setup.registerAction(helloWorldAction);

  const testTrigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: [],
  };
  setup.registerTrigger(testTrigger);
  setup.attachAction('MY-TRIGGER', helloWorldAction.id);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions('MY-TRIGGER', {
    embeddable,
  });

  expect(actions.length).toBe(1);
  expect(actions[0].id).toBe(helloWorldAction.id);
});

test('filters out actions not applicable based on the context', async () => {
  const { setup, doStart } = embeddables;
  const restrictedAction = new RestrictedAction<{ embeddable: IEmbeddable }>(context => {
    return context.embeddable.id === 'accept';
  });

  setup.registerAction(restrictedAction);

  const acceptEmbeddable = new EmptyEmbeddable({ id: 'accept' });
  const rejectEmbeddable = new EmptyEmbeddable({ id: 'reject' });

  const testTrigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: [restrictedAction.id],
  };

  setup.registerTrigger(testTrigger);

  const start = doStart();
  let actions = await start.getTriggerCompatibleActions(testTrigger.id, {
    embeddable: acceptEmbeddable,
  });

  expect(actions.length).toBe(1);

  actions = await start.getTriggerCompatibleActions(testTrigger.id, {
    embeddable: rejectEmbeddable,
  });

  expect(actions.length).toBe(0);
});

test(`throws an error with an invalid trigger ID`, async () => {
  const { doStart } = embeddables;
  const start = doStart();
  const [, error] = await of(
    start.getTriggerCompatibleActions('I do not exist', {
      embeddable: new EmptyEmbeddable({ id: 'empty' }),
    })
  );

  await expect(error).toBeInstanceOf(Error);
  await expect(error.message).toMatchInlineSnapshot(
    `"Trigger [triggerId = I do not exist] does not exist."`
  );
});

test(`with a trigger mapping that maps to an non-existing action returns empty list`, async () => {
  const { setup, doStart } = embeddables;
  const testTrigger = {
    id: '123',
    title: '123',
    actionIds: ['I do not exist'],
  };
  setup.registerTrigger(testTrigger);

  const start = doStart();
  const actions = await start.getTriggerCompatibleActions(testTrigger.id, {
    embeddable: new EmptyEmbeddable({ id: 'empty' }),
  });

  expect(actions).toEqual([]);
});
