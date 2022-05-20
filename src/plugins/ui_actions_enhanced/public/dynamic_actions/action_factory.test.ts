/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionFactory } from './action_factory';
import { ActionFactoryDefinition } from './action_factory_definition';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { PublicLicense } from '@kbn/licensing-plugin/public';

const def: ActionFactoryDefinition = {
  id: 'ACTION_FACTORY_1',
  CollectConfig: {},
  createConfig: () => ({}),
  isConfigValid: () => true,
  create: ({ name }: { name: string }) => ({
    id: '',
    execute: async () => {},
    getDisplayName: () => name,
    enhancements: {},
  }),
  supportedTriggers: () => [],
} as unknown as ActionFactoryDefinition;

const featureUsage = licensingMock.createStart().featureUsage;

const createActionFactory = (
  defOverride: Partial<ActionFactoryDefinition> = {},
  license?: Partial<PublicLicense>
) => {
  return new ActionFactory(
    { ...def, ...defOverride },
    {
      getLicense: () => licensingMock.createLicense({ license }),
      getFeatureUsageStart: () => featureUsage,
    }
  );
};

describe('License & ActionFactory', () => {
  test('no license requirements', async () => {
    const factory = createActionFactory();
    expect(await factory.isCompatible({ triggers: [] })).toBe(true);
    expect(factory.isCompatibleLicense()).toBe(true);
  });

  test('not enough license level', async () => {
    const factory = createActionFactory({ minimalLicense: 'gold', licenseFeatureName: 'Feature' });
    expect(await factory.isCompatible({ triggers: [] })).toBe(true);
    expect(factory.isCompatibleLicense()).toBe(false);
  });

  test('license has expired', async () => {
    const factory = createActionFactory(
      { minimalLicense: 'gold', licenseFeatureName: 'Feature' },
      { type: 'gold', status: 'expired' }
    );
    expect(await factory.isCompatible({ triggers: [] })).toBe(true);
    expect(factory.isCompatibleLicense()).toBe(false);
  });

  test('enough license level', async () => {
    const factory = createActionFactory(
      { minimalLicense: 'gold', licenseFeatureName: 'Feature' },
      { type: 'gold' }
    );

    expect(await factory.isCompatible({ triggers: [] })).toBe(true);
    expect(factory.isCompatibleLicense()).toBe(true);
  });

  describe('licenseFeatureName', () => {
    test('licenseFeatureName is required, if minimalLicense is provided', () => {
      expect(() => {
        createActionFactory();
      }).not.toThrow();

      expect(() => {
        createActionFactory({ minimalLicense: 'gold', licenseFeatureName: 'feature' });
      }).not.toThrow();

      expect(() => {
        createActionFactory({ minimalLicense: 'gold' });
      }).toThrow();
    });

    test('"licenseFeatureName"', () => {
      expect(
        createActionFactory({ minimalLicense: 'gold', licenseFeatureName: 'feature' })
          .licenseFeatureName
      ).toBe('feature');
      expect(createActionFactory().licenseFeatureName).toBeUndefined();
    });
  });

  describe('notifyFeatureUsage', () => {
    const spy = jest.spyOn(featureUsage, 'notifyUsage');
    beforeEach(() => {
      spy.mockClear();
    });
    test('is not called if no license requirements', async () => {
      const action = createActionFactory().create({ name: 'fake', config: {} });
      await action.execute({});
      expect(spy).not.toBeCalled();
    });
    test('is called if has license requirements', async () => {
      const action = createActionFactory({
        minimalLicense: 'gold',
        licenseFeatureName: 'feature',
      }).create({ name: 'fake', config: {} });
      await action.execute({});
      expect(spy).toBeCalledWith('feature');
    });
  });
});

describe('isBeta', () => {
  test('false by default', async () => {
    const factory = createActionFactory();
    expect(factory.isBeta).toBe(false);
  });

  test('true', async () => {
    const factory = createActionFactory({ isBeta: true });
    expect(factory.isBeta).toBe(true);
  });
});
