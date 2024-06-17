/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FeaturesRegistry } from './features_registry';

type TestFeature =
  | { id: 'feature-id-1'; adHocProperty1?: string }
  | { id: 'feature-id-2'; adHocProperty2?: string }
  | { id: 'feature-id-3'; adHocProperty3?: string };

describe('FeaturesRegistry', () => {
  describe('#register', () => {
    test('should add a feature to the registry', () => {
      const registry = new FeaturesRegistry<TestFeature>();

      registry.register({ id: 'feature-id-1' });

      expect(registry.getById('feature-id-1')).toBeDefined();
    });

    test('should throw an error when a feature is already registered by the given id', () => {
      const registry = new FeaturesRegistry<TestFeature>();

      registry.register({ id: 'feature-id-1' });

      expect(() => registry.register({ id: 'feature-id-1' })).toThrow(
        'FeaturesRegistry#register: feature with id "feature-id-1" already exists in the registry.'
      );
    });
  });

  describe('#getById', () => {
    test('should retrieve a feature by its id', () => {
      const registry = new FeaturesRegistry<TestFeature>();

      registry.register({ id: 'feature-id-1', adHocProperty1: 'test' });
      registry.register({ id: 'feature-id-2', adHocProperty2: 'test' });

      expect(registry.getById('feature-id-1')).toEqual({
        id: 'feature-id-1',
        adHocProperty1: 'test',
      });
    });

    test('should return undefined if there is no feature registered by the given id', () => {
      const registry = new FeaturesRegistry<TestFeature>();

      registry.register({ id: 'feature-id-1' });

      expect(registry.getById('feature-id-2')).toBeUndefined();
    });
  });
});
