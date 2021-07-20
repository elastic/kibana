/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { BehaviorSubject } from 'rxjs';
import { REPO_ROOT } from '@kbn/dev-utils';
import { schema } from '@kbn/config-schema';

import { Env } from '../config';
import { CoreContext } from '../core_context';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { configServiceMock, getEnvOptions } from '../config/mocks';

import { PluginWrapper } from './plugin';
import { PluginManifest, PluginType } from './types';
import { createPluginInitializerContext, InstanceInfo } from './plugin_context';

const mockPluginInitializer = jest.fn();
const logger = loggingSystemMock.create();
jest.doMock(
  join('plugin-with-initializer-path', 'server'),
  () => ({ plugin: mockPluginInitializer }),
  { virtual: true }
);
jest.doMock(join('plugin-without-initializer-path', 'server'), () => ({}), {
  virtual: true,
});
jest.doMock(join('plugin-with-wrong-initializer-path', 'server'), () => ({ plugin: {} }), {
  virtual: true,
});

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    kibanaVersion: '7.0.0',
    type: PluginType.standard,
    requiredPlugins: ['some-required-dep'],
    optionalPlugins: ['some-optional-dep'],
    requiredBundles: [],
    server: true,
    ui: true,
    ...manifestProps,
  };
}

const configService = configServiceMock.create();
configService.atPath.mockReturnValue(new BehaviorSubject({ initialize: true }));

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;
let instanceInfo: InstanceInfo;

beforeEach(() => {
  coreId = Symbol('core');
  env = Env.createDefault(REPO_ROOT, getEnvOptions());
  instanceInfo = {
    uuid: 'instance-uuid',
  };

  coreContext = { coreId, env, logger, configService: configService as any };
});

afterEach(() => {
  jest.clearAllMocks();
});

test('`constructor` correctly initializes plugin instance', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'some-plugin-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    ),
  });

  expect(plugin.name).toBe('some-plugin-id');
  expect(plugin.configPath).toBe('path');
  expect(plugin.path).toBe('some-plugin-path');
  expect(plugin.requiredPlugins).toEqual(['some-required-dep']);
  expect(plugin.optionalPlugins).toEqual(['some-optional-dep']);
});

test('`getInstance` fails if `plugin` initializer is not exported', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-without-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    ),
  });

  expect(() => plugin.getInstance()).toThrowErrorMatchingInlineSnapshot(
    `"Plugin \\"some-plugin-id\\" does not export \\"plugin\\" definition (plugin-without-initializer-path)."`
  );
});

test('`getInstance` fails if plugin initializer is not a function', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-wrong-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    ),
  });

  expect(() => plugin.getInstance()).toThrowErrorMatchingInlineSnapshot(
    `"Definition of plugin \\"some-plugin-id\\" should be a function (plugin-with-wrong-initializer-path)."`
  );
});

test('`getInstance` fails if initializer does not return object', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    ),
  });

  mockPluginInitializer.mockReturnValue(null);

  expect(() => plugin.getInstance()).toThrowErrorMatchingInlineSnapshot(
    `"Initializer for plugin \\"some-plugin-id\\" is expected to return plugin instance, but returned \\"null\\"."`
  );
});

test('`getInstance` fails if object returned from initializer does not define `setup` function', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    ),
  });

  const mockPluginInstance = { run: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  expect(() => plugin.getInstance()).toThrowErrorMatchingInlineSnapshot(
    `"Instance of plugin \\"some-plugin-id\\" does not define \\"setup\\" function."`
  );
});

describe('#getConfigSchema()', () => {
  it('reads config schema from plugin', () => {
    const pluginSchema = schema.any();
    const configDescriptor = {
      schema: pluginSchema,
    };
    jest.doMock(
      'plugin-with-schema/server',
      () => ({
        config: configDescriptor,
      }),
      { virtual: true }
    );
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-schema',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      ),
    });

    expect(plugin.getConfigDescriptor()).toBe(configDescriptor);
  });

  it('returns null if config definition not specified', () => {
    jest.doMock('plugin-with-no-definition/server', () => ({}), { virtual: true });
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-no-definition',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      ),
    });
    expect(plugin.getConfigDescriptor()).toBe(null);
  });

  it('returns null for plugins without a server part', () => {
    const manifest = createPluginManifest({ server: false });
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-no-definition',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      ),
    });
    expect(plugin.getConfigDescriptor()).toBe(null);
  });

  it('throws if plugin contains invalid schema', () => {
    jest.doMock(
      'plugin-invalid-schema/server',
      () => ({
        config: {
          schema: {
            validate: () => null,
          },
        },
      }),
      { virtual: true }
    );
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-invalid-schema',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      ),
    });
    expect(() => plugin.getConfigDescriptor()).toThrowErrorMatchingInlineSnapshot(
      `"Configuration schema expected to be an instance of Type"`
    );
  });
});
