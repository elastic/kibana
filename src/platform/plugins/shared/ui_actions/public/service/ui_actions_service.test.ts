/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiActionsService } from './ui_actions_service';
import { ActionDefinition, ActionInternal } from '../actions';
import { createHelloWorldAction } from '../tests/test_samples';
import { TriggerRegistry, ActionRegistry } from '../types';
import { coreMock } from '@kbn/core/public/mocks';
import type { Trigger } from '@kbn/ui-actions-browser/src/triggers';

const FOO_TRIGGER = 'FOO_TRIGGER';
const BAR_TRIGGER = 'BAR_TRIGGER';
const MY_TRIGGER = 'MY_TRIGGER';

const testAction1: ActionDefinition = {
  id: 'action1',
  order: 1,
  type: 'type1',
  execute: async () => {},
  getDisplayName: () => 'test1',
  getIconType: () => '',
  isCompatible: async () => true,
};

const testAction2: ActionDefinition = {
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
        id: BAR_TRIGGER,
      });
    });
  });

  describe('.getTrigger()', () => {
    test('can get Trigger from registry', () => {
      const service = new UiActionsService();
      service.registerTrigger({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });

      const trigger = service.getTrigger(BAR_TRIGGER);

      expect(trigger).toMatchObject({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });
    });

    test('throws if trigger does not exist', () => {
      const service = new UiActionsService();

      expect(() => service.getTrigger(FOO_TRIGGER)).toThrowError(
        'Trigger [triggerId = FOO_TRIGGER] does not exist.'
      );
    });
  });

  describe('.registerActionAsync()', () => {
    test('can register an action', () => {
      const service = new UiActionsService();
      service.registerActionAsync('test', async () => ({
        id: 'test',
        execute: async () => {},
        getDisplayName: () => 'test',
        getIconType: () => '',
        isCompatible: async () => true,
      }));
    });

    test('return action instance', async () => {
      const service = new UiActionsService();
      service.registerActionAsync('test', async () => ({
        id: 'test',
        execute: async () => {},
        getDisplayName: () => 'test',
        getIconType: () => '',
        isCompatible: async () => true,
      }));

      const action = await service.getAction('test');
      expect(action).toBeInstanceOf(ActionInternal);
      expect(action.id).toBe('test');
    });
  });

  describe('.getTriggerActions()', () => {
    const action1: ActionDefinition = {
      id: 'action1',
      order: 1,
      type: 'type1',
      execute: async () => {},
      getDisplayName: () => 'test',
      getIconType: () => '',
      isCompatible: async () => true,
    };
    const action2: ActionDefinition = {
      id: 'action2',
      order: 2,
      type: 'type2',
      execute: async () => {},
      getDisplayName: () => 'test',
      getIconType: () => '',
      isCompatible: async () => true,
    };

    test('returns actions set on trigger', async () => {
      const service = new UiActionsService();

      service.registerActionAsync(action1.id, async () => action1);
      service.registerActionAsync(action2.id, async () => action2);
      service.registerTrigger({
        description: 'foo',
        id: FOO_TRIGGER,
        title: 'baz',
      });

      const list0 = await service.getTriggerActions(FOO_TRIGGER);

      expect(list0).toHaveLength(0);

      service.addTriggerActionAsync(FOO_TRIGGER, 'test', async () => action1);
      const list1 = await service.getTriggerActions(FOO_TRIGGER);

      expect(list1).toHaveLength(1);
      expect(list1[0]).toBeInstanceOf(ActionInternal);
      expect(list1[0].id).toBe(action1.id);

      service.addTriggerActionAsync(FOO_TRIGGER, 'test2', async () => action2);
      const list2 = await service.getTriggerActions(FOO_TRIGGER);

      expect(list2).toHaveLength(2);
      expect(!!list2.find(({ id }: { id: string }) => id === 'action1')).toBe(true);
      expect(!!list2.find(({ id }: { id: string }) => id === 'action2')).toBe(true);
    });
  });

  describe('.getTriggerCompatibleActions()', () => {
    const coreStart = coreMock.createStart();

    test('can register and get actions', async () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });
      const helloWorldAction = createHelloWorldAction(coreStart);
      const length = actions.size;

      service.registerActionAsync(helloWorldAction.id, async () => helloWorldAction);

      expect(actions.size - length).toBe(1);
      const action = await actions.get(helloWorldAction.id)?.();
      expect(action?.id).toBe(helloWorldAction.id);
    });

    test('getTriggerCompatibleActions returns attached actions', async () => {
      const service = new UiActionsService();
      const helloWorldAction = createHelloWorldAction(coreStart);

      service.registerActionAsync('helloWorldAction', async () => helloWorldAction);

      const testTrigger: Trigger = {
        id: MY_TRIGGER,
        title: 'My trigger',
      };
      service.registerTrigger(testTrigger);
      service.addTriggerActionAsync(MY_TRIGGER, 'test', async () => helloWorldAction);

      const compatibleActions = await service.getTriggerCompatibleActions(MY_TRIGGER, {
        hi: 'there',
      });

      expect(compatibleActions.length).toBe(1);
      expect(compatibleActions[0].id).toBe(helloWorldAction.id);
    });

    test('filters out actions not applicable based on the context', async () => {
      const service = new UiActionsService();
      const action = {
        id: 'test',
        type: 'test',
        isCompatible: ({ accept }: { accept: boolean }) => Promise.resolve(accept),
        execute: () => Promise.resolve(),
      };

      service.registerActionAsync('action', async () => action);

      const testTrigger: Trigger = {
        id: MY_TRIGGER,
        title: 'My trigger',
      };

      service.registerTrigger(testTrigger);
      service.addTriggerActionAsync(testTrigger.id, 'test', async () => action);

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

    test('returns empty list if trigger not attached to an action', async () => {
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
        id: FOO_TRIGGER,
      });
      const service2 = service1.fork();

      const trigger1 = service1.getTrigger(FOO_TRIGGER);
      const trigger2 = service2.getTrigger(FOO_TRIGGER);

      expect(trigger1.id).toBe(FOO_TRIGGER);
      expect(trigger2.id).toBe(FOO_TRIGGER);
    });

    test('triggers registered in forked service are not available in original service', () => {
      const service1 = new UiActionsService();
      const service2 = service1.fork();

      service2.registerTrigger({
        id: FOO_TRIGGER,
      });

      expect(() => service1.getTrigger(FOO_TRIGGER)).toThrowErrorMatchingInlineSnapshot(
        `"Trigger [triggerId = FOO_TRIGGER] does not exist."`
      );

      const trigger2 = service2.getTrigger(FOO_TRIGGER);
      expect(trigger2.id).toBe(FOO_TRIGGER);
    });

    test('forked service preserves trigger-to-actions mapping', async () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      service1.registerActionAsync('test', async () => testAction1);
      service1.addTriggerActionAsync(FOO_TRIGGER, 'test', async () => testAction1);

      const service2 = service1.fork();

      const actions1 = await service1.getTriggerActions(FOO_TRIGGER);
      const actions2 = await service2.getTriggerActions(FOO_TRIGGER);

      expect(actions1).toHaveLength(1);
      expect(actions2).toHaveLength(1);
      expect(actions1[0].id).toBe(testAction1.id);
      expect(actions2[0].id).toBe(testAction1.id);
    });

    test('new attachments in fork do not appear in original service', async () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      service1.registerActionAsync('test', async () => testAction1);
      service1.registerActionAsync('test2', async () => testAction2);
      service1.addTriggerActionAsync(FOO_TRIGGER, 'test', async () => testAction1);

      const service2 = service1.fork();

      expect(await service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      expect(await service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      service2.addTriggerActionAsync(FOO_TRIGGER, 'test2', async () => testAction2);

      expect(await service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      expect(await service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(2);
    });

    test('new attachments in original service do not appear in fork', async () => {
      const service1 = new UiActionsService();

      service1.registerTrigger({
        id: FOO_TRIGGER,
      });
      service1.registerActionAsync('test', async () => testAction1);
      service1.registerActionAsync('test2', async () => testAction2);
      service1.addTriggerActionAsync(FOO_TRIGGER, 'test', async () => testAction1);

      const service2 = service1.fork();

      expect(await service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
      expect(await service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);

      service1.addTriggerActionAsync(FOO_TRIGGER, 'test2', async () => testAction2);

      expect(await service1.getTriggerActions(FOO_TRIGGER)).toHaveLength(2);
      expect(await service2.getTriggerActions(FOO_TRIGGER)).toHaveLength(1);
    });
  });

  describe('registries', () => {
    const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

    test('can register trigger', () => {
      const triggers: TriggerRegistry = new Map();
      const service = new UiActionsService({ triggers });

      service.registerTrigger({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });
      const triggerContract = service.getTrigger(BAR_TRIGGER);

      expect(triggerContract).toMatchObject({
        description: 'foo',
        id: BAR_TRIGGER,
        title: 'baz',
      });
    });

    test('can register action', async () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });

      service.registerActionAsync(
        ACTION_HELLO_WORLD,
        async () =>
          ({
            id: ACTION_HELLO_WORLD,
            order: 13,
          } as unknown as ActionDefinition)
      );

      expect(await actions.get(ACTION_HELLO_WORLD)?.()).toMatchObject({
        id: ACTION_HELLO_WORLD,
        order: 13,
      });
    });

    test('can attach an action to a trigger', async () => {
      const service = new UiActionsService();

      const trigger: Trigger = {
        id: MY_TRIGGER,
      };
      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerTrigger(trigger);
      service.addTriggerActionAsync(MY_TRIGGER, ACTION_HELLO_WORLD, async () => action);

      const actions = await service.getTriggerActions(trigger.id);

      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe(ACTION_HELLO_WORLD);
    });

    test('can detach an action from a trigger', async () => {
      const service = new UiActionsService();

      const trigger: Trigger = {
        id: MY_TRIGGER,
      };
      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerTrigger(trigger);
      service.registerActionAsync('test', async () => action);
      service.addTriggerActionAsync(trigger.id, ACTION_HELLO_WORLD, async () => action);
      service.detachAction(trigger.id, action.id);

      const actions2 = await service.getTriggerActions(trigger.id);
      expect(actions2).toEqual([]);
    });

    test('detaching an invalid action from a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerActionAsync('test', async () => action);

      expect(() => service.detachAction('i do not exist', ACTION_HELLO_WORLD)).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for detaching action [actionId = ACTION_HELLO_WORLD].'
      );
    });

    test('attaching an invalid action to a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerActionAsync(ACTION_HELLO_WORLD, async () => action);
      expect(() =>
        service.addTriggerActionAsync('i do not exist', ACTION_HELLO_WORLD, async () => action)
      ).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for attaching action [actionId = ACTION_HELLO_WORLD].'
      );
    });

    test('cannot register another action with the same ID', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerActionAsync(ACTION_HELLO_WORLD, async () => action);
      expect(() =>
        service.registerActionAsync(ACTION_HELLO_WORLD, async () => action)
      ).toThrowError('Action [action.id = ACTION_HELLO_WORLD] already registered.');
    });

    test('cannot register another trigger with the same ID', async () => {
      const service = new UiActionsService();

      const trigger = { id: 'MY-TRIGGER' } as unknown as Trigger;

      service.registerTrigger(trigger);
      expect(() => service.registerTrigger(trigger)).toThrowError(
        'Trigger [trigger.id = MY-TRIGGER] already registered.'
      );
    });
  });
});
