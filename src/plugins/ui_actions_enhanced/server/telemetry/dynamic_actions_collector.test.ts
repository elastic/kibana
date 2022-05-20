/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamicActionsCollector } from './dynamic_actions_collector';
import { DynamicActionsState } from '../../common';

const state: DynamicActionsState = {
  events: [
    {
      eventId: 'eventId-1',
      triggers: ['TRIGGER_1'],
      action: {
        factoryId: 'FACTORY_ID_1',
        name: 'Click me!',
        config: {},
      },
    },
    {
      eventId: 'eventId-2',
      triggers: ['TRIGGER_2', 'TRIGGER_3'],
      action: {
        factoryId: 'FACTORY_ID_2',
        name: 'Click me, too!',
        config: {
          doCleanup: true,
        },
      },
    },
    {
      eventId: 'eventId-3',
      triggers: ['TRIGGER_4', 'TRIGGER_1'],
      action: {
        factoryId: 'FACTORY_ID_1',
        name: 'Go to documentation',
        config: {
          url: 'http://google.com',
          iamFeelingLucky: true,
        },
      },
    },
  ],
};

describe('dynamicActionsCollector', () => {
  describe('dynamic action count', () => {
    test('equal to zero when there are no dynamic actions', () => {
      const stats = dynamicActionsCollector(
        {
          events: [],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.count': 0,
      });
    });

    test('does not update existing count if there are no dynamic actions', () => {
      const stats = dynamicActionsCollector(
        {
          events: [],
        },
        {
          'dynamicActions.count': 25,
        }
      );

      expect(stats).toMatchObject({
        'dynamicActions.count': 25,
      });
    });

    test('equal to one when there is one dynamic action', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.count': 1,
      });
    });

    test('adds one to the current dynamic action count', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {
          'dynamicActions.count': 2,
        }
      );

      expect(stats).toMatchObject({
        'dynamicActions.count': 3,
      });
    });

    test('equal to three when there are three dynamic action', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0], state.events[1], state.events[2]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.count': 3,
      });
    });
  });

  describe('registered action counts', () => {
    test('for single action sets count to one', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.actions.FACTORY_ID_1.count': 1,
      });
    });

    test('adds count to existing action counts', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {
          'dynamicActions.actions.FACTORY_ID_1.count': 5,
          'dynamicActions.actions.FACTORY_ID_2.count': 1,
        }
      );

      expect(stats).toMatchObject({
        'dynamicActions.actions.FACTORY_ID_1.count': 6,
        'dynamicActions.actions.FACTORY_ID_2.count': 1,
      });
    });

    test('aggregates count factory count', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0], state.events[2]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.actions.FACTORY_ID_1.count': 2,
      });
    });

    test('returns counts for every factory type', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0], state.events[2], state.events[1]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.actions.FACTORY_ID_1.count': 2,
        'dynamicActions.actions.FACTORY_ID_2.count': 1,
      });
    });
  });

  describe('action trigger counts', () => {
    test('for single action sets count to one', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.triggers.TRIGGER_1.count': 1,
      });
    });

    test('adds count to existing stats', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {
          'dynamicActions.triggers.TRIGGER_1.count': 123,
        }
      );

      expect(stats).toMatchObject({
        'dynamicActions.triggers.TRIGGER_1.count': 124,
      });
    });

    test('aggregates trigger counts from all dynamic actions', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0], state.events[2], state.events[1]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.triggers.TRIGGER_1.count': 2,
        'dynamicActions.triggers.TRIGGER_2.count': 1,
        'dynamicActions.triggers.TRIGGER_3.count': 1,
        'dynamicActions.triggers.TRIGGER_4.count': 1,
      });
    });
  });

  describe('action x trigger counts', () => {
    test('returns single action (factoryId x trigger) stat', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.action_triggers.FACTORY_ID_1_TRIGGER_1.count': 1,
      });
    });

    test('adds count to existing stats', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0]],
        },
        {
          'dynamicActions.action_triggers.FACTORY_ID_1_TRIGGER_1.count': 3,
        }
      );

      expect(stats).toMatchObject({
        'dynamicActions.action_triggers.FACTORY_ID_1_TRIGGER_1.count': 4,
      });
    });

    test('aggregates actions x triggers counts for all events', () => {
      const stats = dynamicActionsCollector(
        {
          events: [state.events[0], state.events[2], state.events[1]],
        },
        {}
      );

      expect(stats).toMatchObject({
        'dynamicActions.action_triggers.FACTORY_ID_1_TRIGGER_1.count': 2,
        'dynamicActions.action_triggers.FACTORY_ID_2_TRIGGER_2.count': 1,
        'dynamicActions.action_triggers.FACTORY_ID_2_TRIGGER_3.count': 1,
        'dynamicActions.action_triggers.FACTORY_ID_1_TRIGGER_4.count': 1,
      });
    });
  });
});
