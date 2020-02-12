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

import { UiActionsService } from './ui_actions_service';
import { Action } from '../actions';
import { createRestrictedAction, createHelloWorldAction } from '../tests/test_samples';
import { ActionRegistry, TriggerRegistry } from '../types';
import { Trigger } from '../triggers';

const testAction1: Action = {
  id: 'action1',
  order: 1,
  type: 'type1',
  execute: async () => {},
  getDisplayName: () => 'test1',
  getIconType: () => '',
  isCompatible: async () => true,
};

const testAction2: Action = {
  id: 'action2',
  order: 2,
  type: 'type2',
  execute: async () => {},
  getDisplayName: () => 'test2',
  getIconType: () => '',
  isCompatible: async () => true,
};

describe('UiActionsService', () => {
  test('can instantiate', () => {
    new UiActionsService();
  });

  describe('.registerTrigger()', () => {
    test('can register a trigger', () => {
      const service = new UiActionsService();
      service.registerTrigger({
        id: 'test',
      });
    });
  });

  describe('.getTrigger()', () => {
    test('can get Trigger from registry', () => {
      const service = new UiActionsService();
      service.registerTrigger({
        description: 'foo',
        id: 'bar',
        title: 'baz',
      });

      const trigger = service.getTrigger('bar');

      expect(trigger).toEqual({
        description: 'foo',
        id: 'bar',
        title: 'baz',
      });
    });

    test('throws if trigger does not exist', () => {
      const service = new UiActionsService();

      expect(() => service.getTrigger('foo')).toThrowError(
        'Trigger [triggerId = foo] does not exist.'
      );
    });
  });

  describe('.registerAction()', () => {
    test('can register an action', () => {
      const service = new UiActionsService();
      service.registerAction({
        id: 'test',
        execute: async () => {},
        getDisplayName: () => 'test',
        getIconType: () => '',
        isCompatible: async () => true,
        type: 'test',
      });
    });
  });

  describe('.getTriggerActions()', () => {
    const action1: Action = {
      id: 'action1',
      order: 1,
      type: 'type1',
      execute: async () => {},
      getDisplayName: () => 'test',
      getIconType: () => '',
      isCompatible: async () => true,
    };
    const action2: Action = {
      id: 'action2',
      order: 2,
      type: 'type2',
      execute: async () => {},
      getDisplayName: () => 'test',
      getIconType: () => '',
      isCompatible: async () => true,
    };

    test('returns actions set on trigger', () => {
      const service = new UiActionsService();

      service.registerAction(action1);
      service.registerAction(action2);
      service.registerTrigger({
        description: 'foo',
        id: 'trigger',
        title: 'baz',
      });

      const list0 = service.getTriggerActions('trigger');

      expect(list0).toHaveLength(0);

      service.attachAction('trigger', 'action1');
      const list1 = service.getTriggerActions('trigger');

      expect(list1).toHaveLength(1);
      expect(list1).toEqual([action1]);

      service.attachAction('trigger', 'action2');
      const list2 = service.getTriggerActions('trigger');

      expect(list2).toHaveLength(2);
      expect(!!list2.find(({ id }: any) => id === 'action1')).toBe(true);
      expect(!!list2.find(({ id }: any) => id === 'action2')).toBe(true);
    });
  });

  describe('.getTriggerCompatibleActions()', () => {
    test('can register and get actions', async () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });
      const helloWorldAction = createHelloWorldAction({} as any);
      const length = actions.size;

      service.registerAction(helloWorldAction);

      expect(actions.size - length).toBe(1);
      expect(actions.get(helloWorldAction.id)).toBe(helloWorldAction);
    });

    test('getTriggerCompatibleActions returns attached actions', async () => {
      const service = new UiActionsService();
      const helloWorldAction = createHelloWorldAction({} as any);

      service.registerAction(helloWorldAction);

      const testTrigger: Trigger = {
        id: 'MY-TRIGGER',
        title: 'My trigger',
      };
      service.registerTrigger(testTrigger);
      service.attachAction('MY-TRIGGER', helloWorldAction.id);

      const compatibleActions = await service.getTriggerCompatibleActions('MY-TRIGGER', {});

      expect(compatibleActions.length).toBe(1);
      expect(compatibleActions[0].id).toBe(helloWorldAction.id);
    });

    test('filters out actions not applicable based on the context', async () => {
      const service = new UiActionsService();
      const restrictedAction = createRestrictedAction<{ accept: boolean }>(context => {
        return context.accept;
      });

      service.registerAction(restrictedAction);

      const testTrigger: Trigger = {
        id: 'MY-TRIGGER',
        title: 'My trigger',
      };

      service.registerTrigger(testTrigger);
      service.attachAction(testTrigger.id, restrictedAction.id);

      const compatibleActions1 = await service.getTriggerCompatibleActions(testTrigger.id, {
        accept: true,
      });

      expect(compatibleActions1.length).toBe(1);

      const compatibleActions2 = await service.getTriggerCompatibleActions(testTrigger.id, {
        accept: false,
      });

      expect(compatibleActions2.length).toBe(0);
    });

    test(`throws an error with an invalid trigger ID`, async () => {
      const service = new UiActionsService();

      await expect(service.getTriggerCompatibleActions('I do not exist', {})).rejects.toMatchObject(
        new Error('Trigger [triggerId = I do not exist] does not exist.')
      );
    });

    test('returns empty list if trigger not attached to any action', async () => {
      const service = new UiActionsService();
      const testTrigger: Trigger = {
        id: '123',
        title: '123',
      };
      service.registerTrigger(testTrigger);

      const actions = await service.getTriggerCompatibleActions(testTrigger.id, {});

      expect(actions).toEqual([]);
    });
  });

  describe('.fork()', () => {
    test('returns a new instance of the service', () => {
      const service1 = new UiActionsService();
      const service2 = service1.fork();

      expect(service1).not.toBe(service2);
      expect(service2).toBeInstanceOf(UiActionsService);
    });

    test('triggers registered in original service are available in original an forked services', () => {
      const service1 = new UiActionsService();
      service1.registerTrigger({
        id: 'foo',
      });
      const service2 = service1.fork();

      const trigger1 = service1.getTrigger('foo');
      const trigger2 = service2.getTrigger('foo');

      expect(trigger1.id).toBe('foo');
      expect(trigger2.id).toBe('foo');
    });

    test('triggers registered in forked service are not available in original service', () => {
      const service1 = new UiActionsService();
      const service2 = service1.fork();

      service2.registerTrigger({
        id: 'foo',
      });

      expect(() => service1.getTrigger('foo')).toThrowErrorMatchingInlineSnapshot(
        `"Trigger [triggerId = foo] does not exist."`
      );

      const trigger2 = service2.getTrigger('foo');
      expect(trigger2.id).toBe('foo');
    });

    test('forked service preserves trigger-to-actions mapping', () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: 'foo',
      });
      service1.registerAction(testAction1);
      service1.attachAction('foo', testAction1.id);

      const service2 = service1.fork();

      const actions1 = service1.getTriggerActions('foo');
      const actions2 = service2.getTriggerActions('foo');

      expect(actions1).toHaveLength(1);
      expect(actions2).toHaveLength(1);
      expect(actions1[0].id).toBe(testAction1.id);
      expect(actions2[0].id).toBe(testAction1.id);
    });

    test('new attachments in fork do not appear in original service', () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: 'foo',
      });
      service1.registerAction(testAction1);
      service1.registerAction(testAction2);
      service1.attachAction('foo', testAction1.id);

      const service2 = service1.fork();

      expect(service1.getTriggerActions('foo')).toHaveLength(1);
      expect(service2.getTriggerActions('foo')).toHaveLength(1);

      service2.attachAction('foo', testAction2.id);

      expect(service1.getTriggerActions('foo')).toHaveLength(1);
      expect(service2.getTriggerActions('foo')).toHaveLength(2);
    });

    test('new attachments in original service do not appear in fork', () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: 'foo',
      });
      service1.registerAction(testAction1);
      service1.registerAction(testAction2);
      service1.attachAction('foo', testAction1.id);

      const service2 = service1.fork();

      expect(service1.getTriggerActions('foo')).toHaveLength(1);
      expect(service2.getTriggerActions('foo')).toHaveLength(1);

      service1.attachAction('foo', testAction2.id);

      expect(service1.getTriggerActions('foo')).toHaveLength(2);
      expect(service2.getTriggerActions('foo')).toHaveLength(1);
    });
  });

  describe('registries', () => {
    const HELLO_WORLD_ACTION_ID = 'HELLO_WORLD_ACTION_ID';

    test('can register trigger', () => {
      const triggers: TriggerRegistry = new Map();
      const service = new UiActionsService({ triggers });

      service.registerTrigger({
        description: 'foo',
        id: 'bar',
        title: 'baz',
      });

      expect(triggers.get('bar')).toEqual({
        description: 'foo',
        id: 'bar',
        title: 'baz',
      });
    });

    test('can register action', () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });

      service.registerAction({
        id: HELLO_WORLD_ACTION_ID,
        order: 13,
      } as any);

      expect(actions.get(HELLO_WORLD_ACTION_ID)).toMatchObject({
        id: HELLO_WORLD_ACTION_ID,
        order: 13,
      });
    });

    test('can attach an action to a trigger', () => {
      const service = new UiActionsService();

      const trigger: Trigger = {
        id: 'MY-TRIGGER',
      };
      const action = {
        id: HELLO_WORLD_ACTION_ID,
        order: 25,
      } as any;

      service.registerTrigger(trigger);
      service.registerAction(action);
      service.attachAction('MY-TRIGGER', HELLO_WORLD_ACTION_ID);

      const actions = service.getTriggerActions(trigger.id);

      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe(HELLO_WORLD_ACTION_ID);
    });

    test('can detach an action to a trigger', () => {
      const service = new UiActionsService();

      const trigger: Trigger = {
        id: 'MY-TRIGGER',
      };
      const action = {
        id: HELLO_WORLD_ACTION_ID,
        order: 25,
      } as any;

      service.registerTrigger(trigger);
      service.registerAction(action);
      service.attachAction(trigger.id, HELLO_WORLD_ACTION_ID);
      service.detachAction(trigger.id, HELLO_WORLD_ACTION_ID);

      const actions2 = service.getTriggerActions(trigger.id);
      expect(actions2).toEqual([]);
    });

    test('detaching an invalid action from a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: HELLO_WORLD_ACTION_ID,
        order: 25,
      } as any;

      service.registerAction(action);
      expect(() => service.detachAction('i do not exist', HELLO_WORLD_ACTION_ID)).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for detaching action [actionId = HELLO_WORLD_ACTION_ID].'
      );
    });

    test('attaching an invalid action to a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: HELLO_WORLD_ACTION_ID,
        order: 25,
      } as any;

      service.registerAction(action);
      expect(() => service.attachAction('i do not exist', HELLO_WORLD_ACTION_ID)).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for attaching action [actionId = HELLO_WORLD_ACTION_ID].'
      );
    });

    test('cannot register another action with the same ID', async () => {
      const service = new UiActionsService();

      const action = {
        id: HELLO_WORLD_ACTION_ID,
        order: 25,
      } as any;

      service.registerAction(action);
      expect(() => service.registerAction(action)).toThrowError(
        'Action [action.id = HELLO_WORLD_ACTION_ID] already registered.'
      );
    });

    test('cannot register another trigger with the same ID', async () => {
      const service = new UiActionsService();

      const trigger = { id: 'MY-TRIGGER' } as any;

      service.registerTrigger(trigger);
      expect(() => service.registerTrigger(trigger)).toThrowError(
        'Trigger [trigger.id = MY-TRIGGER] already registered.'
      );
    });
  });
});
