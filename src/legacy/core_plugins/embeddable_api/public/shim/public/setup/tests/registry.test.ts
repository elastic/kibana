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

import { registerTrigger, registerAction, attachAction, detachAction } from '..';
import { createDeps } from './helpers';

const HELLO_WORLD_ACTION_ID = 'HELLO_WORLD_ACTION_ID';
const expectError = (fn: (...args: any) => any) => {
  try {
    fn();
    throw new Error('Expected an error throw.');
  } catch (error) {
    return error;
  }
};

test('can register trigger', () => {
  const deps = createDeps();

  registerTrigger(deps)({
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

  registerAction(deps)({
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
  const trigger = {
    id: 'MYTRIGGER',
    actionIds: [],
  };
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  expect(trigger.actionIds).toEqual([]);

  registerTrigger(deps)(trigger);
  registerAction(deps)(action);
  attachAction(deps)('MYTRIGGER', HELLO_WORLD_ACTION_ID);

  expect(trigger.actionIds).toEqual([HELLO_WORLD_ACTION_ID]);
});

test('can dettach an action to a trigger', () => {
  const deps = createDeps();
  const trigger = {
    id: 'MYTRIGGER',
    actionIds: [],
  };
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  expect(trigger.actionIds).toEqual([]);

  registerTrigger(deps)(trigger);
  registerAction(deps)(action);
  attachAction(deps)('MYTRIGGER', HELLO_WORLD_ACTION_ID);
  detachAction(deps)('MYTRIGGER', HELLO_WORLD_ACTION_ID);

  expect(trigger.actionIds).toEqual([]);
});

test('detaching an invalid action from a trigger throws an error', async () => {
  const deps = createDeps();
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  registerAction(deps)(action);
  const error = expectError(() => detachAction(deps)('i do not exist', HELLO_WORLD_ACTION_ID));

  expect(error).toBeInstanceOf(Error);
  expect(error.message).toMatchInlineSnapshot(
    `"No trigger [triggerId = i do not exist] exists, for detaching action [actionId = HELLO_WORLD_ACTION_ID]."`
  );
});

test('attaching an invalid action to a trigger throws an error', async () => {
  const deps = createDeps();
  const action = {
    id: HELLO_WORLD_ACTION_ID,
    order: 25,
  } as any;

  registerAction(deps)(action);
  const error = expectError(() => attachAction(deps)('i do not exist', HELLO_WORLD_ACTION_ID));

  expect(error).toBeInstanceOf(Error);
  expect(error.message).toMatchInlineSnapshot(
    `"No trigger [triggerId = i do not exist] exists, for detaching action [actionId = HELLO_WORLD_ACTION_ID]."`
  );
});
