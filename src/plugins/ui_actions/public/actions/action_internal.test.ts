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

import { ActionDefinition } from './action';
import { ActionInternal } from './action_internal';
import { ActionType } from '../types';

const defaultActionDef: ActionDefinition = {
  id: 'test-action',
  execute: jest.fn(),
};

describe('ActionInternal', () => {
  test('can instantiate from action definition', () => {
    const action = new ActionInternal(defaultActionDef);
    expect(action.id).toBe('test-action');
  });

  describe('serialize()', () => {
    test('can serialize very simple action', () => {
      const action = new ActionInternal(defaultActionDef);
      const serialized = action.serialize();

      expect(serialized).toMatchObject({
        id: 'test-action',
        state: expect.any(Object),
      });
    });

    test('can serialize action with modified state', () => {
      const action = new ActionInternal({
        ...defaultActionDef,
        type: 'ACTION_TYPE' as ActionType,
        order: 11,
      });
      action.state.transitions.setConfig({ foo: 'bar' });
      action.state.transitions.setName('qux');

      const serialized = action.serialize();

      expect(serialized).toMatchObject({
        id: 'test-action',
        type: 'ACTION_TYPE',
        state: {
          name: 'qux',
          config: {
            foo: 'bar',
          },
        },
      });
    });
  });

  describe('deserialize', () => {
    const serialized = {
      id: 'id',
      type: 'type',
      state: {
        name: 'name',
        order: 0,
        config: {
          foo: 'foo',
        },
      },
    };

    test('can deserialize action state', () => {
      const action = new ActionInternal({
        ...defaultActionDef,
      });

      action.deserialize(serialized);

      expect(action.state.get()).toMatchObject(serialized.state);
    });

    test('does not overwrite action id and type', () => {
      const action = new ActionInternal({
        ...defaultActionDef,
      });

      action.deserialize(serialized);

      expect(action.id).toBe('test-action');
      expect(action.type).toBe('');
    });
  });
});
