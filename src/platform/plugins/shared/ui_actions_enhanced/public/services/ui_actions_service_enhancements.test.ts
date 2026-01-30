/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiActionsServiceEnhancementsParams } from './ui_actions_service_enhancements';
import { UiActionsServiceEnhancements } from './ui_actions_service_enhancements';
import type { ActionFactoryDefinition } from '../dynamic_actions';
import { ActionFactory } from '../dynamic_actions';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

const deps: UiActionsServiceEnhancementsParams = {
  getLicense: () => licensingMock.createLicense(),
  featureUsageSetup: licensingMock.createSetup().featureUsage,
  getFeatureUsageStart: () => licensingMock.createStart().featureUsage,
};

describe('UiActionsService', () => {
  describe('action factories', () => {
    const factoryDefinition1: ActionFactoryDefinition = {
      id: 'test-factory-1',
      CollectConfig: {},
      createConfig: () => ({}),
      isConfigValid: () => true,
      create: () => ({}),
      supportedTriggers() {
        return ['VALUE_CLICK_TRIGGER'];
      },
    } as unknown as ActionFactoryDefinition;
    const factoryDefinition2: ActionFactoryDefinition = {
      id: 'test-factory-2',
      CollectConfig: {},
      createConfig: () => ({}),
      isConfigValid: () => true,
      create: () => ({}),
      supportedTriggers() {
        return ['VALUE_CLICK_TRIGGER'];
      },
    } as unknown as ActionFactoryDefinition;

    test('.getActionFactories() returns empty array if no action factories registered', () => {
      const service = new UiActionsServiceEnhancements(deps);

      const factories = service.getActionFactories();

      expect(factories).toEqual([]);
    });

    test('can register and retrieve an action factory', () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory(factoryDefinition1);

      const factory = service.getActionFactory(factoryDefinition1.id);

      expect(factory).toBeInstanceOf(ActionFactory);
      expect(factory.id).toBe(factoryDefinition1.id);
    });

    test('can retrieve all action factories', () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory(factoryDefinition1);
      service.registerActionFactory(factoryDefinition2);

      const factories = service.getActionFactories();
      const factoriesSorted = [...factories].sort((f1, f2) => (f1.id > f2.id ? 1 : -1));

      expect(factoriesSorted.length).toBe(2);
      expect(factoriesSorted[0].id).toBe(factoryDefinition1.id);
      expect(factoriesSorted[1].id).toBe(factoryDefinition2.id);
    });

    test('throws when retrieving action factory that does not exist', () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory(factoryDefinition1);

      expect(() => service.getActionFactory('UNKNOWN_ID')).toThrowError(
        'Action factory [actionFactoryId = UNKNOWN_ID] does not exist.'
      );
    });

    test('isCompatible from definition is used on registered factory', async () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory({
        ...factoryDefinition1,
        isCompatible: () => Promise.resolve(false),
      });

      await expect(
        service.getActionFactory(factoryDefinition1.id).isCompatible({ triggers: [] })
      ).resolves.toBe(false);
    });

    describe('registerFeature for licensing', () => {
      const spy = jest.spyOn(deps.featureUsageSetup!, 'register');
      beforeEach(() => {
        spy.mockClear();
      });
      test('registerFeature is not called if no license requirements', () => {
        const service = new UiActionsServiceEnhancements(deps);
        service.registerActionFactory(factoryDefinition1);
        expect(spy).not.toBeCalled();
      });

      test('registerFeature is called if has license requirements', () => {
        const service = new UiActionsServiceEnhancements(deps);
        service.registerActionFactory({
          ...factoryDefinition1,
          minimalLicense: 'gold',
          licenseFeatureName: 'a name',
        });
        expect(spy).toBeCalledWith('a name', 'gold');
      });
    });
  });
});
