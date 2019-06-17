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

import './np_core.test.mocks';

import {
  HelloWorldAction,
  SayHelloAction,
  EmptyEmbeddable,
  RestrictedAction,
} from './test_samples/index';
import { actionRegistry, ActionContext } from './actions';
import { SAY_HELLO_ACTION } from './test_samples/actions/say_hello_action';
import { triggerRegistry } from './triggers';
import { HELLO_WORLD_ACTION_ID } from './test_samples';
import { getActionsForTrigger } from './get_actions_for_trigger';
import { attachAction } from './triggers/attach_action';

beforeEach(() => {
  actionRegistry.reset();
  triggerRegistry.reset();
});

afterAll(() => {
  actionRegistry.reset();
  triggerRegistry.reset();
});

test('ActionRegistry adding and getting an action', async () => {
  const sayHelloAction = new SayHelloAction(() => {});
  const helloWorldAction = new HelloWorldAction();

  actionRegistry.set(sayHelloAction.id, sayHelloAction);
  actionRegistry.set(helloWorldAction.id, helloWorldAction);

  expect(actionRegistry.length()).toBe(2);

  expect(actionRegistry.get(sayHelloAction.id)).toBe(sayHelloAction);
  expect(actionRegistry.get(helloWorldAction.id)).toBe(helloWorldAction);
});

test(`ActionRegistry getting an action that doesn't exist returns undefined`, async () => {
  expect(actionRegistry.get(SAY_HELLO_ACTION)).toBeUndefined();
});

test('getActionsForTrigger returns attached actions', async () => {
  const embeddable = new EmptyEmbeddable({ id: '123' });
  const helloWorldAction = new HelloWorldAction();
  actionRegistry.set(helloWorldAction.id, helloWorldAction);

  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: [],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  attachAction(triggerRegistry, { triggerId: 'MYTRIGGER', actionId: HELLO_WORLD_ACTION_ID });

  const moreActions = await getActionsForTrigger(actionRegistry, triggerRegistry, 'MYTRIGGER', {
    embeddable,
  });

  expect(moreActions.length).toBe(1);
});

test('getActionsForTrigger filters out actions not applicable based on the context', async () => {
  const action = new RestrictedAction((context: ActionContext) => {
    return context.embeddable.id === 'accept';
  });
  actionRegistry.set(action.id, action);
  const acceptEmbeddable = new EmptyEmbeddable({ id: 'accept' });
  const rejectEmbeddable = new EmptyEmbeddable({ id: 'reject' });

  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: [action.id],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  let actions = await getActionsForTrigger(actionRegistry, triggerRegistry, testTrigger.id, {
    embeddable: acceptEmbeddable,
  });

  expect(actions.length).toBe(1);

  actions = await getActionsForTrigger(actionRegistry, triggerRegistry, testTrigger.id, {
    embeddable: rejectEmbeddable,
  });

  expect(actions.length).toBe(0);
});

test(`getActionsForTrigger with an invalid trigger id throws an error`, async () => {
  async function check() {
    await getActionsForTrigger(actionRegistry, triggerRegistry, 'I do not exist', {
      embeddable: new EmptyEmbeddable({ id: 'empty' }),
    });
  }
  await expect(check()).rejects.toThrow(Error);
});

test(`getActionsForTrigger with a trigger mapping that maps to an non existant action throws an error`, async () => {
  const testTrigger = {
    id: '123',
    title: '123',
    actionIds: ['I do not exist'],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  async function check() {
    await getActionsForTrigger(actionRegistry, triggerRegistry, '123', {
      embeddable: new EmptyEmbeddable({ id: 'empty' }),
    });
  }
  await expect(check()).rejects.toThrow(Error);
});
