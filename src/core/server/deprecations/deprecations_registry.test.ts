/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import type { RegisterDeprecationsConfig, GetDeprecationsContext } from './types';
import { DeprecationsRegistry } from './deprecations_registry';

describe('DeprecationsRegistry', () => {
  describe('registerDeprecations', () => {
    it('throws if getDeprecations is not a function', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const deprecationsConfig = {
        getDeprecations: null,
      } as unknown as RegisterDeprecationsConfig;
      expect(() => deprecationsRegistry.registerDeprecations(deprecationsConfig)).toThrowError(
        /getDeprecations must be a function/
      );
    });

    it('registers deprecation context', () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const getDeprecations = jest.fn();
      const deprecationsConfig = { getDeprecations };
      deprecationsRegistry.registerDeprecations(deprecationsConfig);
      expect(deprecationsRegistry['deprecationContexts']).toStrictEqual([deprecationsConfig]);
    });

    it('allows registering multiple contexts', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const deprecationsConfigA = { getDeprecations: jest.fn() };
      const deprecationsConfigB = { getDeprecations: jest.fn() };
      deprecationsRegistry.registerDeprecations(deprecationsConfigA);
      deprecationsRegistry.registerDeprecations(deprecationsConfigB);
      expect(deprecationsRegistry['deprecationContexts']).toStrictEqual([
        deprecationsConfigA,
        deprecationsConfigB,
      ]);
    });
  });

  describe('getDeprecations', () => {
    it('returns all settled deprecations', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const mockContext = {} as unknown as GetDeprecationsContext;
      const mockError = new Error();
      const deprecationsConfigA = { getDeprecations: jest.fn().mockResolvedValue('hi') };
      const deprecationsConfigB = { getDeprecations: jest.fn().mockRejectedValue(mockError) };
      deprecationsRegistry.registerDeprecations(deprecationsConfigA);
      deprecationsRegistry.registerDeprecations(deprecationsConfigB);
      const deprecations = await deprecationsRegistry.getDeprecations(mockContext);
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

    it('rejects deprecations when reaching the timeout', async () => {
      const deprecationsRegistry = new DeprecationsRegistry({ timeout: 100 });
      const mockContext = {} as unknown as GetDeprecationsContext;
      const deprecationsConfigA = {
        getDeprecations: jest.fn().mockReturnValue(new Promise(() => {})),
      };
      deprecationsRegistry.registerDeprecations(deprecationsConfigA);
      const deprecations = await deprecationsRegistry.getDeprecations(mockContext);
      expect(deprecations).toStrictEqual([
        {
          status: 'rejected',
          reason: expect.any(Error),
        },
      ]);
      expect((deprecations[0] as PromiseRejectedResult).reason.message).toEqual(
        'Deprecations did not resolve in 10sec.'
      );
    });

    it('passes dependencies to registered getDeprecations function', async () => {
      const deprecationsRegistry = new DeprecationsRegistry();
      const mockContext = {} as unknown as GetDeprecationsContext;
      const deprecationsConfig = { getDeprecations: jest.fn().mockResolvedValue('hi') };
      deprecationsRegistry.registerDeprecations(deprecationsConfig);
      const deprecations = await deprecationsRegistry.getDeprecations(mockContext);
      expect(deprecations).toHaveLength(1);
      expect(deprecationsConfig.getDeprecations).toBeCalledWith(mockContext);
    });
  });
});
