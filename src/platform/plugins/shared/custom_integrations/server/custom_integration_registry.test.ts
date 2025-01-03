/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomIntegrationRegistry } from './custom_integration_registry';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { IntegrationCategory, CustomIntegration } from '../common';

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
});
