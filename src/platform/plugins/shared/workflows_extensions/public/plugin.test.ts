/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { WorkflowsExtensionsPublicPlugin } from './plugin';

jest.mock('./steps', () => ({
  registerInternalStepDefinitions: jest.fn(),
}));

const { registerInternalStepDefinitions } = jest.requireMock('./steps');

const createPlugin = () => {
  const initContext = coreMock.createPluginInitializerContext();
  return new WorkflowsExtensionsPublicPlugin(initContext);
};

describe('WorkflowsExtensionsPublicPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('calls registerInternalStepDefinitions', () => {
      const plugin = createPlugin();
      plugin.setup(coreMock.createSetup(), {});

      expect(registerInternalStepDefinitions).toHaveBeenCalledTimes(1);
    });

    it('returns registerStepDefinition that delegates to step registry', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});

      const definition = { id: 'test.step' } as any;
      setup.registerStepDefinition(definition);

      // Duplicate should throw, proving delegation to real registry
      expect(() => setup.registerStepDefinition(definition)).toThrow(/already registered/);
    });

    it('returns registerTriggerDefinition that delegates to trigger registry', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});

      const definition = { id: 'test.trigger' } as any;
      setup.registerTriggerDefinition(definition);

      expect(() => setup.registerTriggerDefinition(definition)).toThrow(/already registered/);
    });
  });

  describe('start', () => {
    it('returns step registry accessors', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});
      const definition = { id: 'my.step' } as any;
      setup.registerStepDefinition(definition);

      const start = plugin.start(coreMock.createStart(), {});

      expect(start.hasStepDefinition('my.step')).toBe(true);
      expect(start.getStepDefinition('my.step')).toEqual(
        expect.objectContaining({ id: 'my.step' })
      );
      expect(start.getAllStepDefinitions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'my.step' })])
      );
      expect(start.hasStepDefinition('nonexistent')).toBe(false);
    });

    it('returns trigger registry accessors', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});
      const definition = { id: 'my.trigger' } as any;
      setup.registerTriggerDefinition(definition);

      const start = plugin.start(coreMock.createStart(), {});

      expect(start.hasTriggerDefinition('my.trigger')).toBe(true);
      expect(start.getTriggerDefinition('my.trigger')).toEqual(
        expect.objectContaining({ id: 'my.trigger' })
      );
      expect(start.getAllTriggerDefinitions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'my.trigger' })])
      );
    });

    it('isReady resolves when both registries have settled', async () => {
      const plugin = createPlugin();
      plugin.setup(coreMock.createSetup(), {});
      const start = plugin.start(coreMock.createStart(), {});

      // No async loaders registered, should resolve immediately
      await expect(start.isReady()).resolves.toBeUndefined();
    });

    it('isReady waits for async step loaders', async () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});

      let resolveLoader!: (def: any) => void;
      const loaderPromise = new Promise<any>((resolve) => {
        resolveLoader = resolve;
      });
      setup.registerStepDefinition(() => loaderPromise);

      const start = plugin.start(coreMock.createStart(), {});

      let ready = false;
      const readyPromise = start.isReady().then(() => {
        ready = true;
      });

      // Should not be ready yet
      expect(ready).toBe(false);

      // Resolve the loader
      resolveLoader({ id: 'async.step' });
      await readyPromise;

      expect(ready).toBe(true);
      expect(start.hasStepDefinition('async.step')).toBe(true);
    });
  });

  describe('stop', () => {
    it('does not throw', () => {
      const plugin = createPlugin();
      expect(() => plugin.stop()).not.toThrow();
    });
  });
});
