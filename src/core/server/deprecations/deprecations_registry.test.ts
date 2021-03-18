/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RegisterDeprecationsConfig, DeprecationDependencies } from './types';
import { DeprecationsRegistry } from './deprecations_registry';

describe('DeprecationsRegistry', () => {
  describe('registerDeprecations', () => {
    it('throws if getDeprecations is not a function', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const context = ({ getDeprecations: null } as unknown) as RegisterDeprecationsConfig;
      expect(() => deprecationsRegistry.registerDeprecations(context)).toThrowError(
        /getDeprecations must be a function/
      );
    });

    it('registers deprecation context', () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const getDeprecations = jest.fn();
      const context = { getDeprecations };
      deprecationsRegistry.registerDeprecations(context);
      expect(deprecationsRegistry.deprecationContexts).toStrictEqual([context]);
    });

    it('allows registering multiple contexts', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const contextA = { getDeprecations: jest.fn() };
      const contextB = { getDeprecations: jest.fn() };
      deprecationsRegistry.registerDeprecations(contextA);
      deprecationsRegistry.registerDeprecations(contextB);
      expect(deprecationsRegistry.deprecationContexts).toStrictEqual([contextA, contextB]);
    });
  });

  describe('getDeprecations', () => {
    it('returns all settled deprecations', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const mockDependencies = ({} as unknown) as DeprecationDependencies;
      const mockError = new Error();
      const contextA = { getDeprecations: jest.fn().mockResolvedValue('hi') };
      const contextB = { getDeprecations: jest.fn().mockRejectedValue(mockError) };
      deprecationsRegistry.registerDeprecations(contextA);
      deprecationsRegistry.registerDeprecations(contextB);
      const deprecations = await deprecationsRegistry.getDeprecations(mockDependencies);
      expect(deprecations).toStrictEqual([
        {
          status: 'fulfilled',
          value: 'hi',
        },
        {
          status: 'rejected',
          reason: mockError,
        },
      ]);
    });

    it('passes dependencies to registered getDeprecations function', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const mockDependencies = ({} as unknown) as DeprecationDependencies;
      const context = { getDeprecations: jest.fn().mockResolvedValue('hi') };
      deprecationsRegistry.registerDeprecations(context);
      const deprecations = await deprecationsRegistry.getDeprecations(mockDependencies);
      expect(deprecations).toHaveLength(1);
      expect(context.getDeprecations).toBeCalledWith(mockDependencies);
    });
  });
});
