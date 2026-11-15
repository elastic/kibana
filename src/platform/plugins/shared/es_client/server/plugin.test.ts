/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { ES_CLIENT_API_VERSION, ES_CLIENT_ROUTE_PATH } from '../common';
import { plugin } from '.';
import { EsClientPlugin } from './plugin';

const IDLE_SOCKET_TIMEOUT_MS = 130_000;

const setup = () => {
  const coreSetup = coreMock.createSetup();
  const router = mockRouter.create();
  coreSetup.http.createRouter.mockReturnValue(router);
  const esClientPlugin = new EsClientPlugin(coreMock.createPluginInitializerContext());
  esClientPlugin.setup(coreSetup);
  return { esClientPlugin, router };
};

describe('WHEN setting up the server Elasticsearch client plugin', () => {
  it('SHOULD create the plugin from the server entry point', async () => {
    expect(await plugin(coreMock.createPluginInitializerContext())).toBeInstanceOf(EsClientPlugin);
  });

  it('SHOULD register the GET route, which also serves HEAD, without a body', () => {
    const { router } = setup();

    const { config, versions } = router.versioned.getRoute('get', ES_CLIENT_ROUTE_PATH);

    expect(config).toMatchObject({
      access: 'internal',
      security: { authz: { enabled: false } },
      options: { timeout: { idleSocket: IDLE_SOCKET_TIMEOUT_MS } },
    });
    expect(config.options).not.toHaveProperty('body');
    expect(versions[ES_CLIENT_API_VERSION].handler).toEqual(expect.any(Function));
  });

  it.each(['post', 'put', 'delete'] as const)(
    'SHOULD register the %s route with an unparsed body',
    (method) => {
      const { router } = setup();

      const { config, versions } = router.versioned.getRoute(method, ES_CLIENT_ROUTE_PATH);

      expect(config).toMatchObject({
        access: 'internal',
        security: { authz: { enabled: false } },
        options: {
          body: { output: 'data', parse: false },
          timeout: { idleSocket: IDLE_SOCKET_TIMEOUT_MS },
        },
      });
      expect(versions[ES_CLIENT_API_VERSION].handler).toEqual(expect.any(Function));
    }
  );

  it('SHOULD have no start or stop work', () => {
    const { esClientPlugin } = setup();

    expect(esClientPlugin.start()).toBeUndefined();
    expect(esClientPlugin.stop()).toBeUndefined();
  });
});
