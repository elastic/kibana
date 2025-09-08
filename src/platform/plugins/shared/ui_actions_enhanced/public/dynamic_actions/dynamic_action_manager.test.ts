/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DynamicActionManager } from './dynamic_action_manager';
import type { ActionStorage } from './dynamic_action_storage';
import { MemoryActionStorage } from './dynamic_action_storage';
import { of } from '@kbn/kibana-utils-plugin/common';
import { UiActionsServiceEnhancements } from '../services';
import type { ActionFactoryDefinition } from './action_factory_definition';
import type { SerializedAction, SerializedEvent } from './types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { dynamicActionGrouping } from './dynamic_action_grouping';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

const actionFactoryDefinition1: ActionFactoryDefinition = {
  id: 'ACTION_FACTORY_1',
  CollectConfig: {},
  createConfig: () => ({}),
  isConfigValid: () => true,
  create: ({ name }: { name: string }) => ({
    id: '',
    execute: async () => {},
    getDisplayName: () => name,
  }),
  supportedTriggers() {
    return ['VALUE_CLICK_TRIGGER'];
  },
} as unknown as ActionFactoryDefinition;

const actionFactoryDefinition2: ActionFactoryDefinition = {
  id: 'ACTION_FACTORY_2',
  CollectConfig: {},
  createConfig: () => ({}),
  isConfigValid: () => true,
  create: ({ name }: { name: string }) => ({
    id: '',
    execute: async () => {},
    getDisplayName: () => name,
  }),
  supportedTriggers() {
    return ['VALUE_CLICK_TRIGGER'];
  },
} as unknown as ActionFactoryDefinition;

const event1: SerializedEvent = {
  eventId: 'EVENT_ID_1',
  triggers: ['VALUE_CLICK_TRIGGER'],
  action: {
    factoryId: actionFactoryDefinition1.id,
    name: 'Action 1',
    config: {},
  },
};

const event2: SerializedEvent = {
  eventId: 'EVENT_ID_2',
  triggers: ['VALUE_CLICK_TRIGGER'],
  action: {
    factoryId: actionFactoryDefinition1.id,
    name: 'Action 2',
    config: {},
  },
};

const event3: SerializedEvent = {
  eventId: 'EVENT_ID_3',
  triggers: ['VALUE_CLICK_TRIGGER'],
  action: {
    factoryId: actionFactoryDefinition2.id,
    name: 'Action 3',
    config: {},
  },
};

const setup = (
  events: readonly SerializedEvent[] = [],
  { getLicenseInfo = () => licensingMock.createLicense() } = {
    getLicenseInfo: () => licensingMock.createLicense(),
  }
) => {
  const isCompatible = async () => true;
  const storage: ActionStorage = new MemoryActionStorage(events);
  const uiActions = uiActionsPluginMock.createStartContract();
  const uiActionsEnhancements = new UiActionsServiceEnhancements({
    getLicense: getLicenseInfo,
    featureUsageSetup: licensingMock.createSetup().featureUsage,
    getFeatureUsageStart: () => licensingMock.createStart().featureUsage,
  });
  const manager = new DynamicActionManager({
    isCompatible,
    storage,
    uiActions: { ...uiActions, ...uiActionsEnhancements },
  });

  uiActions.hasAction.mockReturnValue(true);

  return {
    storage,
    uiActions: { ...uiActions, ...uiActionsEnhancements },
    manager,
  };
};

describe('DynamicActionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('can instantiate', () => {
    const { manager } = setup([event1]);
    expect(manager).toBeInstanceOf(DynamicActionManager);
  });

  describe('.start()', () => {
    test('instantiates stored events', async () => {
      const { manager, uiActions } = setup([event1]);
      const create1 = jest.spyOn(actionFactoryDefinition1, 'create');
      const create2 = jest.spyOn(actionFactoryDefinition2, 'create');

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      expect(create1).toHaveBeenCalledTimes(0);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
      expect(uiActions.attachAction).toHaveBeenCalledTimes(0);

      await manager.start();

      expect(create1).toHaveBeenCalledTimes(1);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(uiActions.registerAction).toHaveBeenCalledTimes(1);
      expect(uiActions.registerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          getDisplayName: expect.any(Function),
          execute: expect.any(Function),
          id: expect.stringContaining('EVENT_ID_1'),
          grouping: dynamicActionGrouping,
        })
      );
      expect(uiActions.attachAction).toHaveBeenCalledTimes(1);
      expect(uiActions.attachAction).toHaveBeenCalledWith(
        'VALUE_CLICK_TRIGGER',
        expect.stringContaining('EVENT_ID_1')
      );
    });

    test('does nothing when no events stored', async () => {
      const { manager, uiActions } = setup();
      const create1 = jest.spyOn(actionFactoryDefinition1, 'create');
      const create2 = jest.spyOn(actionFactoryDefinition2, 'create');

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      expect(create1).toHaveBeenCalledTimes(0);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
      expect(uiActions.attachAction).toHaveBeenCalledTimes(0);

      await manager.start();

      expect(create1).toHaveBeenCalledTimes(0);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
      expect(uiActions.attachAction).toHaveBeenCalledTimes(0);
    });

    test('UI state is empty before manager starts', async () => {
      const { manager } = setup([event1]);

      expect(manager.state.get()).toMatchObject({
        events: [],
        isFetchingEvents: false,
        fetchCount: 0,
      });
    });

    test('loads events into UI state', async () => {
      const { manager, uiActions } = setup([event1, event2, event3]);

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      await manager.start();

      expect(manager.state.get()).toMatchObject({
        events: [event1, event2, event3],
        isFetchingEvents: false,
        fetchCount: 1,
      });
    });

    test('sets isFetchingEvents to true while fetching events', async () => {
      const { manager, uiActions } = setup([event1, event2, event3]);

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      const promise = manager.start().catch(() => {});

      expect(manager.state.get().isFetchingEvents).toBe(true);

      await promise;

      expect(manager.state.get().isFetchingEvents).toBe(false);
    });

    test('throws if storage threw', async () => {
      const { manager, storage } = setup([event1]);

      storage.list = async () => {
        throw new Error('baz');
      };

      const [, error] = await of(manager.start());

      expect(error).toEqual(new Error('baz'));
    });

    test('sets UI state error if error happened during initial fetch', async () => {
      const { manager, storage } = setup([event1]);

      storage.list = async () => {
        throw new Error('baz');
      };

      await of(manager.start());

      expect(manager.state.get().fetchError!.message).toBe('baz');
    });
  });

  describe('.stop()', () => {
    test('removes events from UI actions registry', async () => {
      const { manager, uiActions } = setup([event1, event2]);

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
      expect(uiActions.attachAction).toHaveBeenCalledTimes(0);

      await manager.start();

      expect(uiActions.registerAction).toHaveBeenCalledTimes(2);
      expect(uiActions.attachAction).toHaveBeenCalledTimes(2);

      await manager.stop();

      expect(uiActions.unregisterAction).toHaveBeenCalledTimes(2);
      expect(uiActions.detachAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('.createEvent()', () => {
    describe('when storage succeeds', () => {
      test('stores new event in storage', async () => {
        const { manager, storage, uiActions } = setup([]);

        uiActions.registerActionFactory(actionFactoryDefinition1);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        expect(await storage.count()).toBe(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);

        expect(await storage.count()).toBe(1);

        const [event] = await storage.list();

        expect(event).toMatchObject({
          eventId: expect.any(String),
          triggers: ['VALUE_CLICK_TRIGGER'],
          action: {
            factoryId: actionFactoryDefinition1.id,
            name: 'foo',
            config: {},
          },
        });
      });

      test('adds event to UI state', async () => {
        const { manager, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);

        expect(manager.state.get().events.length).toBe(1);
      });

      test('adds revived actions to "dynamic action" grouping', async () => {
        const { manager, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);
        expect(uiActions.registerAction).toHaveBeenCalledWith(
          expect.objectContaining({
            grouping: dynamicActionGrouping,
          })
        );
      });

      test('optimistically adds event to UI state', async () => {
        const { manager, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        const promise = manager.createEvent(action, ['VALUE_CLICK_TRIGGER']).catch((e) => e);

        expect(manager.state.get().events.length).toBe(1);

        await promise;

        expect(manager.state.get().events.length).toBe(1);
      });

      test('instantiates event in actions service', async () => {
        const { manager, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
        expect(uiActions.attachAction).toHaveBeenCalledTimes(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);

        expect(uiActions.registerAction).toHaveBeenCalledTimes(1);
        expect(uiActions.attachAction).toHaveBeenCalledTimes(1);
      });
    });

    describe('when storage fails', () => {
      test('throws an error', async () => {
        const { manager, storage, uiActions } = setup([]);

        storage.create = async () => {
          throw new Error('foo');
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        const [, error] = await of(manager.createEvent(action, ['VALUE_CLICK_TRIGGER']));

        expect(error).toEqual(new Error('foo'));
      });

      test('does not add even to UI state', async () => {
        const { manager, storage, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        storage.create = async () => {
          throw new Error('foo');
        };
        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();
        await of(manager.createEvent(action, ['VALUE_CLICK_TRIGGER']));

        expect(manager.state.get().events.length).toBe(0);
      });

      test('optimistically adds event to UI state and then removes it', async () => {
        const { manager, storage, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        storage.create = async () => {
          throw new Error('foo');
        };
        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        const promise = manager.createEvent(action, ['VALUE_CLICK_TRIGGER']).catch((e) => e);

        expect(manager.state.get().events.length).toBe(1);

        await promise;

        expect(manager.state.get().events.length).toBe(0);
      });

      test('does not instantiate event in actions service', async () => {
        const { manager, storage, uiActions } = setup([]);
        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        storage.create = async () => {
          throw new Error('foo');
        };
        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
        expect(uiActions.attachAction).toHaveBeenCalledTimes(0);

        await of(manager.createEvent(action, ['VALUE_CLICK_TRIGGER']));

        expect(uiActions.registerAction).toHaveBeenCalledTimes(0);
        expect(uiActions.attachAction).toHaveBeenCalledTimes(0);
      });

      test('throws when trigger is unknown', async () => {
        const { manager, uiActions } = setup([]);

        uiActions.registerActionFactory(actionFactoryDefinition1);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };
        await expect(manager.createEvent(action, ['SELECT_RANGE_TRIGGER'])).rejects.toThrow();
      });
    });
  });

  describe('.updateEvent()', () => {
    describe('when storage succeeds', () => {
      test('un-registers old event from ui actions service and registers the new one', async () => {
        const { manager, uiActions } = setup([event3]);

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        expect(uiActions.registerAction).toHaveBeenCalledTimes(1);
        expect(uiActions.attachAction).toHaveBeenCalledTimes(1);

        const registeredAction1 = uiActions.registerAction.mock.calls[0][0];

        expect(registeredAction1?.getDisplayName?.({})).toBe('Action 3');

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        await manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']);

        expect(uiActions.detachAction).toHaveBeenCalledWith(
          'VALUE_CLICK_TRIGGER',
          expect.stringContaining('EVENT_ID_3')
        );
        expect(uiActions.unregisterAction).toHaveBeenCalledWith(
          expect.stringContaining('EVENT_ID_3')
        );

        const registeredAction2 = uiActions.registerAction.mock.calls[1][0];

        expect(registeredAction2?.getDisplayName?.({})).toBe('foo');
      });

      test('updates event in storage', async () => {
        const { manager, storage, uiActions } = setup([event3]);
        const storageUpdateSpy = jest.spyOn(storage, 'update');

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(storageUpdateSpy).toHaveBeenCalledTimes(0);

        await manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']);

        expect(storageUpdateSpy).toHaveBeenCalledTimes(1);
        expect(storageUpdateSpy.mock.calls[0][0]).toMatchObject({
          eventId: expect.any(String),
          triggers: ['VALUE_CLICK_TRIGGER'],
          action: {
            factoryId: actionFactoryDefinition2.id,
          },
        });
      });

      test('updates event in UI state', async () => {
        const { manager, uiActions } = setup([event3]);

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(manager.state.get().events[0].action.name).toBe('Action 3');

        await manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']);

        expect(manager.state.get().events[0].action.name).toBe('foo');
      });

      test('optimistically updates event in UI state', async () => {
        const { manager, uiActions } = setup([event3]);

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(manager.state.get().events[0].action.name).toBe('Action 3');

        const promise = manager
          .updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER'])
          .catch((e) => e);

        expect(manager.state.get().events[0].action.name).toBe('foo');

        await promise;
      });
    });

    describe('when storage fails', () => {
      test('throws error', async () => {
        const { manager, storage, uiActions } = setup([event3]);

        storage.update = () => {
          throw new Error('bar');
        };
        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        const [, error] = await of(
          manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER'])
        );

        expect(error).toEqual(new Error('bar'));
      });

      test('keeps the old action in actions registry', async () => {
        const { manager, storage, uiActions } = setup([event3]);

        storage.update = () => {
          throw new Error('bar');
        };
        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        expect(uiActions.registerAction).toHaveBeenCalledTimes(1);
        expect(uiActions.attachAction).toHaveBeenCalledTimes(1);

        const registeredAction1 = uiActions.registerAction.mock.calls[0][0];

        expect(registeredAction1?.getDisplayName?.({})).toBe('Action 3');

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        await of(manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']));

        expect(uiActions.detachAction).toHaveBeenCalledWith(
          'VALUE_CLICK_TRIGGER',
          expect.stringContaining('EVENT_ID_3')
        );
        expect(uiActions.unregisterAction).toHaveBeenCalledWith(
          expect.stringContaining('_EVENT_ID_3')
        );

        const registeredAction2 = uiActions.registerAction.mock.calls[1][0];
        expect(registeredAction2?.getDisplayName?.({})).toBe('foo');
      });

      test('keeps old event in UI state', async () => {
        const { manager, storage, uiActions } = setup([event3]);

        storage.update = () => {
          throw new Error('bar');
        };
        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(manager.state.get().events[0].action.name).toBe('Action 3');

        await of(manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']));

        expect(manager.state.get().events[0].action.name).toBe('Action 3');
      });
    });
  });

  describe('.deleteEvents()', () => {
    describe('when storage succeeds', () => {
      test('removes all actions from uiActions service', async () => {
        const { manager, uiActions } = setup([event2, event1]);

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(uiActions.registerAction).toHaveBeenCalledTimes(2);

        await manager.deleteEvents([event1.eventId, event2.eventId]);

        expect(uiActions.detachAction).toHaveBeenCalledTimes(2);
        expect(uiActions.unregisterAction).toHaveBeenCalledTimes(2);
      });

      test('removes all events from storage', async () => {
        const { manager, uiActions, storage } = setup([event2, event1]);

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(await storage.list()).toEqual([event2, event1]);

        await manager.deleteEvents([event1.eventId, event2.eventId]);

        expect(await storage.list()).toEqual([]);
      });

      test('removes all events from UI state', async () => {
        const { manager, uiActions } = setup([event2, event1]);

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events).toEqual([event2, event1]);

        await manager.deleteEvents([event1.eventId, event2.eventId]);

        expect(manager.state.get().events).toEqual([]);
      });
    });
  });

  test('revived actions incompatible when license is not enough', async () => {
    const getLicenseInfo = jest.fn(() =>
      licensingMock.createLicense({ license: { type: 'basic' } })
    );
    const { manager, uiActions } = setup([event1, event3], { getLicenseInfo });
    const basicActionFactory: ActionFactoryDefinition = {
      ...actionFactoryDefinition1,
      minimalLicense: 'basic',
      licenseFeatureName: 'Feature 1',
    };

    const goldActionFactory: ActionFactoryDefinition = {
      ...actionFactoryDefinition2,
      minimalLicense: 'gold',
      licenseFeatureName: 'Feature 2',
    };

    uiActions.registerActionFactory(basicActionFactory);
    uiActions.registerActionFactory(goldActionFactory);

    await manager.start();

    const basicFactory = uiActions.getActionFactory(actionFactoryDefinition1.id);
    const goldFactory = uiActions.getActionFactory(actionFactoryDefinition2.id);

    expect(basicFactory?.isCompatibleLicense()).toBe(true);
    expect(goldFactory?.isCompatibleLicense()).toBe(false);

    getLicenseInfo.mockImplementation(() =>
      licensingMock.createLicense({ license: { type: 'gold' } })
    );

    expect(basicFactory?.isCompatibleLicense()).toBe(true);
    expect(goldFactory?.isCompatibleLicense()).toBe(true);
  });

  test("failing to revive/kill an action doesn't fail action manager", async () => {
    const { manager, uiActions, storage } = setup([event1, event3, event2]);
    uiActions.registerActionFactory(actionFactoryDefinition1);

    await manager.start();

    // since event3's factory is not registered, it will skip registering that action
    expect(uiActions.registerAction).toHaveBeenCalledTimes(2);
    const registeredAction1 = uiActions.registerAction.mock.calls[0][0];
    expect(registeredAction1?.getDisplayName?.({})).toBe('Action 1');
    const registeredAction2 = uiActions.registerAction.mock.calls[1][0];
    expect(registeredAction2?.getDisplayName?.({})).toBe('Action 2');

    expect(await storage.list()).toEqual([event1, event3, event2]);

    uiActions.hasAction.mockImplementation((actionId: string) =>
      [registeredAction1.id, registeredAction2.id].includes(actionId)
    );
    await manager.stop();
    // since event3's action is not registered, it will skip unregistering that action
    expect(uiActions.unregisterAction).toHaveBeenCalledTimes(2);
    expect(uiActions.unregisterAction).toHaveBeenCalledWith(expect.stringContaining('EVENT_ID_1'));
    expect(uiActions.unregisterAction).toHaveBeenCalledWith(expect.stringContaining('EVENT_ID_2'));
  });
});
