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

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

import {
  HelloWorldAction,
  SayHelloAction,
  EmptyEmbeddable,
  RestrictedAction,
} from '../__test__/index';
import { actionRegistry } from './action_registry';
import { SAY_HELLO_ACTION } from '../__test__/actions/say_hello_action';
import { triggerRegistry } from '../triggers';
import { ActionContext } from './action';
import { HELLO_WORLD_ACTION } from '../__test__/actions/hello_world_action';

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

  actionRegistry.addAction(sayHelloAction);
  actionRegistry.addAction(helloWorldAction);

  expect(Object.keys(actionRegistry.getActions()).length).toBe(2);

  expect(actionRegistry.getAction(sayHelloAction.id)).toBe(sayHelloAction);
  expect(actionRegistry.getAction(helloWorldAction.id)).toBe(helloWorldAction);
});

test('ActionRegistry removing an action', async () => {
  const sayHelloAction = new SayHelloAction(() => {});
  const helloWorldAction = new HelloWorldAction();

  actionRegistry.addAction(sayHelloAction);
  actionRegistry.addAction(helloWorldAction);
  actionRegistry.removeAction(sayHelloAction.id);

  expect(Object.keys(actionRegistry.getActions()).length).toBe(1);

  expect(actionRegistry.getAction(helloWorldAction.id)).toBe(helloWorldAction);
});

test(`ActionRegistry getting an action that doesn't exist returns undefined`, async () => {
  expect(actionRegistry.getAction(SAY_HELLO_ACTION)).toBeUndefined();
});

test(`Adding two actions with the same id throws an erro`, async () => {
  expect(Object.keys(actionRegistry.getActions()).length).toBe(0);
  const helloWorldAction = new HelloWorldAction();
  actionRegistry.addAction(helloWorldAction);
  expect(() => actionRegistry.addAction(helloWorldAction)).toThrowError();
});

test('getActionsForTrigger returns attached actions', async () => {
  const embeddable = new EmptyEmbeddable({ id: '123' });
  const helloWorldAction = new HelloWorldAction();
  actionRegistry.addAction(helloWorldAction);

  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: [],
  };
  triggerRegistry.registerTrigger(testTrigger);

  triggerRegistry.attachAction({ triggerId: 'MYTRIGGER', actionId: HELLO_WORLD_ACTION });

  const moreActions = await actionRegistry.getActionsForTrigger('MYTRIGGER', {
    embeddable,
  });

  expect(moreActions.length).toBe(1);
});

test('getActionsForTrigger filters out actions not applicable based on the context', async () => {
  const action = new RestrictedAction((context: ActionContext) => {
    return context.embeddable.id === 'accept';
  });
  actionRegistry.addAction(action);
  const acceptEmbeddable = new EmptyEmbeddable({ id: 'accept' });
  const rejectEmbeddable = new EmptyEmbeddable({ id: 'reject' });

  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: [action.id],
  };
  triggerRegistry.registerTrigger(testTrigger);

  let actions = await actionRegistry.getActionsForTrigger(testTrigger.id, {
    embeddable: acceptEmbeddable,
  });

  expect(actions.length).toBe(1);

  actions = await actionRegistry.getActionsForTrigger(testTrigger.id, {
    embeddable: rejectEmbeddable,
  });

  expect(actions.length).toBe(0);
});

test(`getActionsForTrigger with an invalid trigger id throws an error`, async () => {
  async function check() {
    await actionRegistry.getActionsForTrigger('I do not exist', {
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
  triggerRegistry.registerTrigger(testTrigger);

  async function check() {
    await actionRegistry.getActionsForTrigger('123', {
      embeddable: new EmptyEmbeddable({ id: 'empty' }),
    });
  }
  await expect(check()).rejects.toThrow(Error);
});
