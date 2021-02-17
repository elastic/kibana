/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import Chance from 'chance';
import { Server } from 'http';
import supertest from 'supertest';

import { ByteSizeValue } from '@kbn/config-schema';
import { HttpConfig } from '.';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { HttpsRedirectServer } from './https_redirect_server';

const chance = new Chance();

let server: HttpsRedirectServer;
let config: HttpConfig;

function getServerListener(httpServer: HttpsRedirectServer) {
  return (httpServer as any).server.listener;
}

beforeEach(() => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: chance.integer({ min: 10000, max: 15000 }),
    ssl: {
      enabled: true,
      redirectHttpFromPort: chance.integer({ min: 20000, max: 30000 }),
    },
    cors: {
      enabled: false,
    },
  } as HttpConfig;

  server = new HttpsRedirectServer(loggingSystemMock.create().get());
});

afterEach(async () => {
  await server.stop();
});

test('throws if SSL is not enabled', async () => {
  await expect(
    server.start({
      ...config,
      ssl: {
        enabled: false,
        redirectHttpFromPort: chance.integer({ min: 20000, max: 30000 }),
      },
    } as HttpConfig)
  ).rejects.toMatchSnapshot();
});

test('throws if [redirectHttpFromPort] is not specified', async () => {
  await expect(
    server.start({
      ...config,
      ssl: { enabled: true },
    } as HttpConfig)
  ).rejects.toMatchSnapshot();
});

test('throws if [redirectHttpFromPort] is in use', async () => {
  const mockListen = jest.spyOn(Server.prototype, 'listen').mockImplementation(() => {
    // eslint-disable-next-line no-throw-literal
    throw { code: 'EADDRINUSE' };
  });

  await expect(
    server.start({
      ...config,
      ssl: { enabled: true },
    } as HttpConfig)
  ).rejects.toMatchSnapshot();

  mockListen.mockRestore();
});

test('forwards http requests to https', async () => {
  await server.start(config);

  await supertest(getServerListener(server))
    .get('/')
    .expect(302)
    .then((res) => {
      expect(res.header.location).toEqual(`https://${config.host}:${config.port}/`);
    });
});
