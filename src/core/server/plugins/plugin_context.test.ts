/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { duration } from 'moment';
import { first } from 'rxjs/operators';
import { REPO_ROOT } from '@kbn/dev-utils';
import { createPluginInitializerContext, InstanceInfo } from './plugin_context';
import { CoreContext } from '../core_context';
import { Env } from '../config';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { rawConfigServiceMock, getEnvOptions } from '../config/mocks';
import { PluginManifest } from './types';
import { Server } from '../server';
import { fromRoot } from '../utils';
import { ByteSizeValue } from '@kbn/config-schema';

const logger = loggingSystemMock.create();

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;
let server: Server;
let instanceInfo: InstanceInfo;

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    kibanaVersion: '7.0.0',
    requiredPlugins: ['some-required-dep'],
    requiredBundles: [],
    optionalPlugins: ['some-optional-dep'],
    server: true,
    ui: true,
    ...manifestProps,
  };
}

describe('createPluginInitializerContext', () => {
  beforeEach(async () => {
    coreId = Symbol('core');
    instanceInfo = {
      uuid: 'instance-uuid',
    };
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    const config$ = rawConfigServiceMock.create({ rawConfig: {} });
    server = new Server(config$, env, logger);
    await server.setupCoreConfig();
    coreContext = { coreId, env, logger, configService: server.configService };
  });

  it('should return a globalConfig handler in the context', async () => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const pluginInitializerContext = createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    );

    expect(pluginInitializerContext.config.legacy.globalConfig$).toBeDefined();

    const configObject = await pluginInitializerContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();
    expect(configObject).toStrictEqual({
      kibana: {
        index: '.kibana',
        autocompleteTerminateAfter: duration(100000),
        autocompleteTimeout: duration(1000),
      },
      elasticsearch: {
        shardTimeout: duration(30, 's'),
        requestTimeout: duration(30, 's'),
        pingTimeout: duration(30, 's'),
      },
      path: { data: fromRoot('data') },
      savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
    });
  });

  it('allow to access the provided instance uuid', () => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    instanceInfo = {
      uuid: 'kibana-uuid',
    };
    const pluginInitializerContext = createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    );
    expect(pluginInitializerContext.env.instanceUuid).toBe('kibana-uuid');
  });
});
