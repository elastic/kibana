/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomIntegrationRegistry } from './custom_integration_registry';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { IntegrationCategory, CustomIntegration } from '../common';

describe('CustomIntegrationsRegistry', () => {
  let mockLogger: MockedLogger;

  const integration: CustomIntegration = {
    id: 'foo',
    title: 'Foo',
    description: 'test integration',
    type: 'ui_link',
    uiInternalPath: '/path/to/foo',
    isBeta: false,
    icons: [],
    categories: ['apm'],
    shipper: 'tests',
  };

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });

  describe('register', () => {
    describe('should log to console on duplicate id', () => {
      test('with an error in dev', () => {
        const registry = new CustomIntegrationRegistry(mockLogger, true);
        registry.registerCustomIntegration(integration);
        registry.registerCustomIntegration(integration);
        expect(mockLogger.error.mock.calls.length).toBe(1);
      });
      test('with a debug in prod', () => {
        const registry = new CustomIntegrationRegistry(mockLogger, false);
        registry.registerCustomIntegration(integration);
        registry.registerCustomIntegration(integration);
        expect(mockLogger.debug.mock.calls.length).toBe(1);
      });
    });

    test('should strip unsupported categories', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration({
        ...integration,
        categories: ['apm', 'foobar'] as IntegrationCategory[],
      });
      expect(registry.getAppendCustomIntegrations()).toEqual([
        {
          categories: ['apm'],
          description: 'test integration',
          icons: [],
          id: 'foo',
          isBeta: false,
          shipper: 'tests',
          title: 'Foo',
          type: 'ui_link',
          uiInternalPath: '/path/to/foo',
        },
      ]);
    });
  });

  describe('getAppendCustomCategories', () => {
    test('should  return', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration(integration);
      registry.registerCustomIntegration({ ...integration, id: 'bar' });
      expect(registry.getAppendCustomIntegrations()).toEqual([
        {
          categories: ['apm'],
          description: 'test integration',
          icons: [],
          id: 'foo',
          isBeta: false,
          shipper: 'tests',
          title: 'Foo',
          type: 'ui_link',
          uiInternalPath: '/path/to/foo',
        },
        {
          categories: ['apm'],
          description: 'test integration',
          icons: [],
          id: 'bar',
          isBeta: false,
          shipper: 'tests',
          title: 'Foo',
          type: 'ui_link',
          uiInternalPath: '/path/to/foo',
        },
      ]);
    });
    test('should filter duplicate ids', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration(integration);
      registry.registerCustomIntegration(integration);
      expect(registry.getAppendCustomIntegrations()).toEqual([
        {
          categories: ['apm'],
          description: 'test integration',
          icons: [],
          id: 'foo',
          isBeta: false,
          shipper: 'tests',
          title: 'Foo',
          type: 'ui_link',
          uiInternalPath: '/path/to/foo',
        },
      ]);
    });
    test('should filter integrations without category', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration(integration);
      registry.registerCustomIntegration({ ...integration, id: 'bar', categories: [] });

      expect(registry.getAppendCustomIntegrations()).toEqual([
        {
          categories: ['apm'],
          description: 'test integration',
          icons: [],
          id: 'foo',
          isBeta: false,
          shipper: 'tests',
          title: 'Foo',
          type: 'ui_link',
          uiInternalPath: '/path/to/foo',
        },
      ]);
    });

    test('should filter integrations that need to replace EPR packages', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration({ ...integration, id: 'bar', eprOverlap: 'aws' });
      expect(registry.getAppendCustomIntegrations()).toEqual([]);
    });
  });

  describe('getReplacementCustomIntegrations', () => {
    test('should only return integrations with corresponding epr package ', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration(integration);
      registry.registerCustomIntegration({ ...integration, id: 'bar', eprOverlap: 'aws' });
      expect(registry.getReplacementCustomIntegrations()).toEqual([
        {
          categories: ['apm'],
          description: 'test integration',
          icons: [],
          id: 'bar',
          isBeta: false,
          shipper: 'tests',
          title: 'Foo',
          type: 'ui_link',
          uiInternalPath: '/path/to/foo',
          eprOverlap: 'aws',
        },
      ]);
    });

    test('should filter registrations without valid categories', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, true);
      registry.registerCustomIntegration({
        ...integration,
        id: 'bar',
        eprOverlap: 'aws',
        categories: ['foobar'] as unknown as IntegrationCategory[],
      });
      expect(registry.getReplacementCustomIntegrations()).toEqual([]);
    });
  });

  describe('registerDeferredInitializer', () => {
    test('deferred initializer is called exactly once before the first read', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, false);
      const init = jest.fn(() => {
        registry.registerCustomIntegration(integration);
      });

      registry.registerDeferredInitializer(init);

      // Not yet called — no read has happened.
      expect(init).not.toHaveBeenCalled();

      // First read triggers materialisation.
      registry.getAppendCustomIntegrations();
      expect(init).toHaveBeenCalledTimes(1);

      // Subsequent reads do NOT call the initializer again.
      registry.getAppendCustomIntegrations();
      registry.getReplacementCustomIntegrations();
      expect(init).toHaveBeenCalledTimes(1);
    });

    test('integrations registered inside a deferred initializer are visible after the first read', () => {
      const registry = new CustomIntegrationRegistry(mockLogger, false);
      registry.registerDeferredInitializer(() => {
        registry.registerCustomIntegration(integration);
      });

      expect(registry.getAppendCustomIntegrations()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: integration.id })])
      );
    });

    test('multiple deferred initializers run in registration order', () => {
      const order: number[] = [];
      const registry = new CustomIntegrationRegistry(mockLogger, false);
      registry.registerDeferredInitializer(() => order.push(1));
      registry.registerDeferredInitializer(() => order.push(2));
      registry.registerDeferredInitializer(() => order.push(3));

      registry.getAppendCustomIntegrations();
      expect(order).toEqual([1, 2, 3]);
    });
  });
});
