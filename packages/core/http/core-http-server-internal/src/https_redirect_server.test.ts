/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as net from 'node:net';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import Chance from 'chance';
import { Server } from 'http';
import supertest from 'supertest';

import { ByteSizeValue } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HttpConfig } from '..';
import { HttpsRedirectServer } from './https_redirect_server';

const chance = new Chance();

let server: HttpsRedirectServer;
let config: HttpConfig;

function getServerListener(httpServer: HttpsRedirectServer) {
  return (httpServer as any).server.listener;
}

async function getRandomAvailablePort(opts: Chance.Options): Promise<number> {
  while (true) {
    const candidatePort = chance.integer(opts);
    try {
      await new Promise<void>((resolve, reject) => {
        const svr = net.createServer();
        svr.once('error', reject);
        svr.listen({ host: '127.0.0.1', port: candidatePort }, () => {
          svr.close(() => {
            resolve();
          });
        });
      });
      return candidatePort;
    } catch (err) {
      // just keep trying to find another port
    }
  }
}

beforeEach(async () => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: await getRandomAvailablePort({ min: 10000, max: 15000 }),
    ssl: {
      enabled: true,
      redirectHttpFromPort: await getRandomAvailablePort({ min: 20000, max: 30000 }),
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
        redirectHttpFromPort: await getRandomAvailablePort({ min: 20000, max: 30000 }),
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

test('keeps the request host when redirecting', async () => {
  await server.start(config);

  await supertest(`http://localhost:${config.ssl.redirectHttpFromPort}`)
    .get('/')
    .expect(302)
    .then((res) => {
      expect(res.header.location).toEqual(`https://localhost:${config.port}/`);
    });
});
