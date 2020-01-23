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

import { createApi } from '../api';
import { createDeps } from '../tests/helpers';

const HELLO_WORLD_ACTION_ID = 'HELLO_WORLD_ACTION_ID';

test('can register trigger', () => {
  const deps = createDeps();
  const { api } = createApi(deps);

  api.registerTrigger({
    actionIds: [],
    description: 'foo',
    id: 'bar',
    title: 'baz',
  });

  expect(deps.triggers.get('bar')).toEqual({
    actionIds: [],
    description: 'foo',
    id: 'bar',
    title: 'baz',
  });
});

test('can register action', () => {
  const deps = createDeps();
  const { api } = createApi(deps);

  api.registerAction({
    id: HELLO_WORLD_ACTION_ID,
    order: 13,
  } as any);

  expect(deps.actions.get(HELLO_WORLD_ACTION_ID)).toMatchObject({
    id: HELLO_WORLD_ACTION_ID,
    order: 13,
  });
});

test('can attach an action to a trigger', () => {
  const deps = createDeps();
  const { api } = createApi(deps);
  const trigger = {
    id: 'MY-TRIGGER',
    actionIds: [],
  };
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  expect(trigger.actionIds).toEqual([]);

  api.registerTrigger(trigger);
  api.registerAction(action);
  api.attachAction('MY-TRIGGER', HELLO_WORLD_ACTION_ID);

  expect(trigger.actionIds).toEqual([HELLO_WORLD_ACTION_ID]);
});

test('can detach an action to a trigger', () => {
  const deps = createDeps();
  const { api } = createApi(deps);
  const trigger = {
    id: 'MY-TRIGGER',
    actionIds: [],
  };
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  expect(trigger.actionIds).toEqual([]);

  api.registerTrigger(trigger);
  api.registerAction(action);
  api.attachAction('MY-TRIGGER', HELLO_WORLD_ACTION_ID);
  api.detachAction('MY-TRIGGER', HELLO_WORLD_ACTION_ID);

  expect(trigger.actionIds).toEqual([]);
});

test('detaching an invalid action from a trigger throws an error', async () => {
  const { api } = createApi({ actions: new Map<any, any>(), triggers: new Map<any, any>() });
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  api.registerAction(action);
  expect(() => api.detachAction('i do not exist', HELLO_WORLD_ACTION_ID)).toThrowError(
    'No trigger [triggerId = i do not exist] exists, for detaching action [actionId = HELLO_WORLD_ACTION_ID].'
  );
});

test('attaching an invalid action to a trigger throws an error', async () => {
  const { api } = createApi({ actions: new Map<any, any>(), triggers: new Map<any, any>() });
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  api.registerAction(action);
  expect(() => api.attachAction('i do not exist', HELLO_WORLD_ACTION_ID)).toThrowError(
    'No trigger [triggerId = i do not exist] exists, for attaching action [actionId = HELLO_WORLD_ACTION_ID].'
  );
});

test('cannot register another action with the same ID', async () => {
  const { api } = createApi({ actions: new Map<any, any>(), triggers: new Map<any, any>() });
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  api.registerAction(action);
  expect(() => api.registerAction(action)).toThrowError(
    'Action [action.id = HELLO_WORLD_ACTION_ID] already registered.'
  );
});

test('cannot register another trigger with the same ID', async () => {
  const { api } = createApi({ actions: new Map<any, any>(), triggers: new Map<any, any>() });
  const trigger = { id: 'MY-TRIGGER' } as any;

  api.registerTrigger(trigger);
  expect(() => api.registerTrigger(trigger)).toThrowError(
    'Trigger [trigger.id = MY-TRIGGER] already registered.'
  );
});
