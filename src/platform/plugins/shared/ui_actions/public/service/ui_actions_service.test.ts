/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiActionsService } from './ui_actions_service';
import type { ActionDefinition } from '../actions';
import { ActionInternal } from '../actions';
import { createHelloWorldAction } from '../tests/test_samples';
import type { ActionRegistry } from '../types';
import { coreMock } from '@kbn/core/public/mocks';
import { CONTEXT_MENU_TRIGGER } from '../../common/trigger_ids';
import { triggers } from '../triggers';

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

  describe('.getTrigger()', () => {
    test('can get Trigger from lookup table', () => {
      const service = new UiActionsService();

      const trigger = service.getTrigger(CONTEXT_MENU_TRIGGER);

      expect(trigger).toMatchObject(triggers.CONTEXT_MENU_TRIGGER);
    });

    test('throws if trigger does not exist', () => {
      const service = new UiActionsService();

      expect(() => service.getTrigger('FOO_TRIGGER')).toThrowError(
        'Trigger [triggerId = FOO_TRIGGER] does not exist.'
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

    test('return action instance', () => {
      const service = new UiActionsService();
      const action = service.registerAction({
        id: 'test',
        execute: async () => {},
        getDisplayName: () => 'test',
        getIconType: () => '',
        isCompatible: async () => true,
        type: 'test',
      });

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

      service.registerAction(action1);
      service.registerAction(action2);

      const list0 = await service.getTriggerActions(CONTEXT_MENU_TRIGGER);

      expect(list0).toHaveLength(0);

      service.addTriggerAction(CONTEXT_MENU_TRIGGER, action1);
      const list1 = await service.getTriggerActions(CONTEXT_MENU_TRIGGER);

      expect(list1).toHaveLength(1);
      expect(list1[0]).toBeInstanceOf(ActionInternal);
      expect(list1[0].id).toBe(action1.id);

      service.addTriggerAction(CONTEXT_MENU_TRIGGER, action2);
      const list2 = await service.getTriggerActions(CONTEXT_MENU_TRIGGER);

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

      service.registerAction(helloWorldAction);

      expect(actions.size - length).toBe(1);
      const action = await actions.get(helloWorldAction.id)?.();
      expect(action?.id).toBe(helloWorldAction.id);
    });

    test('getTriggerCompatibleActions returns attached actions', async () => {
      const service = new UiActionsService();
      const helloWorldAction = createHelloWorldAction(coreStart);

      service.registerAction(helloWorldAction);

      service.addTriggerAction(CONTEXT_MENU_TRIGGER, helloWorldAction);

      const compatibleActions = await service.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
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

      service.registerAction(action);

      service.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

      const compatibleActions1 = await service.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
        accept: true,
      });

      expect(compatibleActions1.length).toBe(1);

      const compatibleActions2 = await service.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {
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

      const actions = await service.getTriggerCompatibleActions(CONTEXT_MENU_TRIGGER, {});

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

    test('forked service preserves trigger-to-actions mapping', async () => {
      const service1 = new UiActionsService();

      service1.registerAction(testAction1);
      service1.addTriggerAction(CONTEXT_MENU_TRIGGER, testAction1);

      const service2 = service1.fork();

      const actions1 = await service1.getTriggerActions(CONTEXT_MENU_TRIGGER);
      const actions2 = await service2.getTriggerActions(CONTEXT_MENU_TRIGGER);

      expect(actions1).toHaveLength(1);
      expect(actions2).toHaveLength(1);
      expect(actions1[0].id).toBe(testAction1.id);
      expect(actions2[0].id).toBe(testAction1.id);
    });

    test('new attachments in fork do not appear in original service', async () => {
      const service1 = new UiActionsService();

      service1.registerAction(testAction1);
      service1.registerAction(testAction2);
      service1.addTriggerAction(CONTEXT_MENU_TRIGGER, testAction1);

      const service2 = service1.fork();

      expect(await service1.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(1);
      expect(await service2.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(1);

      service2.addTriggerAction(CONTEXT_MENU_TRIGGER, testAction2);

      expect(await service1.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(1);
      expect(await service2.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(2);
    });

    test('new attachments in original service do not appear in fork', async () => {
      const service1 = new UiActionsService();

      service1.registerAction(testAction1);
      service1.registerAction(testAction2);
      service1.addTriggerAction(CONTEXT_MENU_TRIGGER, testAction1);

      const service2 = service1.fork();

      expect(await service1.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(1);
      expect(await service2.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(1);

      service1.addTriggerAction(CONTEXT_MENU_TRIGGER, testAction2);

      expect(await service1.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(2);
      expect(await service2.getTriggerActions(CONTEXT_MENU_TRIGGER)).toHaveLength(1);
    });
  });

  describe('registries', () => {
    const ACTION_HELLO_WORLD = 'ACTION_HELLO_WORLD';

    test('can register action', async () => {
      const actions: ActionRegistry = new Map();
      const service = new UiActionsService({ actions });

      service.registerAction({
        id: ACTION_HELLO_WORLD,
        order: 13,
      } as unknown as ActionDefinition);

      expect(await actions.get(ACTION_HELLO_WORLD)?.()).toMatchObject({
        id: ACTION_HELLO_WORLD,
        order: 13,
      });
    });

    test('can attach an action to a trigger', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

      const actions = await service.getTriggerActions(CONTEXT_MENU_TRIGGER);

      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe(ACTION_HELLO_WORLD);
    });

    test('can detach an action from a trigger', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerAction(action);
      service.addTriggerAction(CONTEXT_MENU_TRIGGER, action);
      service.detachAction(CONTEXT_MENU_TRIGGER, action.id);

      const actions2 = await service.getTriggerActions(CONTEXT_MENU_TRIGGER);
      expect(actions2).toEqual([]);
    });

    test('detaching an invalid action from a trigger throws an error', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerAction(action);
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

      service.registerAction(action);
      expect(() => service.addTriggerAction('i do not exist', action)).toThrowError(
        'No trigger [triggerId = i do not exist] exists, for attaching action [actionId = ACTION_HELLO_WORLD].'
      );
    });

    test('cannot register another action with the same ID', async () => {
      const service = new UiActionsService();

      const action = {
        id: ACTION_HELLO_WORLD,
        order: 25,
      } as unknown as ActionDefinition;

      service.registerAction(action);
      expect(() => service.registerAction(action)).toThrowError(
        'Action [action.id = ACTION_HELLO_WORLD] already registered.'
      );
    });
  });
});
