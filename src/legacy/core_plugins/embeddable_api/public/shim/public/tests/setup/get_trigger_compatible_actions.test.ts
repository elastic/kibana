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

import { HelloWorldAction } from '../../lib/test_samples/actions/hello_world_action';
import { SayHelloAction } from '../../lib/test_samples/actions/say_hello_action';
import { RestrictedAction } from '../../lib/test_samples/actions/restricted_action';
import { EmptyEmbeddable } from '../../lib/test_samples/embeddables/empty_embeddable';
import { ActionContext, CONTEXT_MENU_TRIGGER } from '../../lib';
import { EmbeddableSetupApi } from '../../setup';
import { createSetupApi } from '..';
import { of } from '../helpers';
import { EmbeddablePublicPlugin } from '../../plugin';

let api: EmbeddableSetupApi;
let plugin: EmbeddablePublicPlugin;
let action: SayHelloAction;

const reset = () => {
  ({ api, plugin } = createSetupApi());
  action = new SayHelloAction(() => {});

  api.registerAction(action);
  api.attachAction(CONTEXT_MENU_TRIGGER, action.id);
};

beforeEach(reset);

test('can register and get actions', async () => {
  const helloWorldAction = new HelloWorldAction();
  const length = (plugin as any).actions.size;

  api.registerAction(helloWorldAction);

  expect((plugin as any).actions.size - length).toBe(1);
  expect((plugin as any).actions.get(action.id)).toBe(action);
  expect((plugin as any).actions.get(helloWorldAction.id)).toBe(helloWorldAction);
});

test('getTriggerCompatibleActions returns attached actions', async () => {
  const embeddable = new EmptyEmbeddable({ id: '123' });
  const helloWorldAction = new HelloWorldAction();

  api.registerAction(helloWorldAction);

  const testTrigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: [],
  };
  api.registerTrigger(testTrigger);
  api.attachAction('MY-TRIGGER', helloWorldAction.id);

  const actions = await api.getTriggerCompatibleActions('MY-TRIGGER', {
    embeddable,
  });

  expect(actions.length).toBe(1);
  expect(actions[0].id).toBe(helloWorldAction.id);
});

test('filters out actions not applicable based on the context', async () => {
  const action = new RestrictedAction((context: ActionContext) => {
    return context.embeddable.id === 'accept';
  });

  api.registerAction(action);

  const acceptEmbeddable = new EmptyEmbeddable({ id: 'accept' });
  const rejectEmbeddable = new EmptyEmbeddable({ id: 'reject' });

  const testTrigger = {
    id: 'MY-TRIGGER',
    title: 'My trigger',
    actionIds: [action.id],
  };

  api.registerTrigger(testTrigger);

  let actions = await api.getTriggerCompatibleActions(testTrigger.id, {
    embeddable: acceptEmbeddable,
  });

  expect(actions.length).toBe(1);

  actions = await api.getTriggerCompatibleActions(testTrigger.id, {
    embeddable: rejectEmbeddable,
  });

  expect(actions.length).toBe(0);
});

test(`throws an error with an invalid trigger ID`, async () => {
  const [, error] = await of(
    api.getTriggerCompatibleActions('I do not exist', {
      embeddable: new EmptyEmbeddable({ id: 'empty' }),
    })
  );

  await expect(error).toBeInstanceOf(Error);
  await expect(error.message).toMatchInlineSnapshot(
    `"Trigger [triggerId = I do not exist] does not exist."`
  );
});

test(`with a trigger mapping that maps to an non-existing action returns empty list`, async () => {
  const testTrigger = {
    id: '123',
    title: '123',
    actionIds: ['I do not exist'],
  };
  api.registerTrigger(testTrigger);

  const actions = await api.getTriggerCompatibleActions(testTrigger.id, {
    embeddable: new EmptyEmbeddable({ id: 'empty' }),
  });
  
  expect(actions).toEqual([]);
});
