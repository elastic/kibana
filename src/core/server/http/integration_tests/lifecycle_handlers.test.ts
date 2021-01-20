/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import supertest from 'supertest';
import { BehaviorSubject } from 'rxjs';
import { ByteSizeValue } from '@kbn/config-schema';

import { createHttpServer } from '../test_utils';
import { HttpService } from '../http_service';
import { HttpServerSetup } from '../http_server';
import { IRouter, RouteRegistrar } from '../router';

import { configServiceMock } from '../../config/mocks';
import { contextServiceMock } from '../../context/context_service.mock';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../../../package.json');

const actualVersion = pkg.version;
const versionHeader = 'kbn-version';
const xsrfHeader = 'kbn-xsrf';
const nameHeader = 'kbn-name';
const allowlistedTestPath = '/xsrf/test/route/whitelisted';
const xsrfDisabledTestPath = '/xsrf/test/route/disabled';
const kibanaName = 'my-kibana-name';
const setupDeps = {
  context: contextServiceMock.createSetupContract(),
};

describe('core lifecycle handlers', () => {
  let server: HttpService;
  let innerServer: HttpServerSetup['server'];
  let router: IRouter;

  beforeEach(async () => {
    const configService = configServiceMock.create();
    configService.atPath.mockImplementation((path) => {
      if (path === 'server') {
        return new BehaviorSubject({
          hosts: ['localhost'],
          maxPayload: new ByteSizeValue(1024),
          autoListen: true,
          ssl: {
            enabled: false,
          },
          cors: {
            enabled: false,
          },
          compression: { enabled: true },
          name: kibanaName,
          customResponseHeaders: {
            'some-header': 'some-value',
          },
          xsrf: { disableProtection: false, allowlist: [allowlistedTestPath] },
          requestId: {
            allowFromAnyIp: true,
            ipAllowlist: [],
          },
        } as any);
      }
      if (path === 'externalUrl') {
        return new BehaviorSubject({
          policy: [],
        } as any);
      }
      if (path === 'csp') {
        return new BehaviorSubject({} as any);
      }
      throw new Error(`Unexpected config path: ${path}`);
    });
    server = createHttpServer({ configService });

    const serverSetup = await server.setup(setupDeps);
    router = serverSetup.createRouter('/');
    innerServer = serverSetup.server;
  }, 30000);

  afterEach(async () => {
    await server.stop();
  });

  describe('versionCheck post-auth handler', () => {
    const testRoute = '/version_check/test/route';

    beforeEach(async () => {
      router.get({ path: testRoute, validate: false }, (context, req, res) => {
        return res.ok({ body: 'ok' });
      });
      await server.start();
    });

    it('accepts requests with the correct version passed in the version header', async () => {
      await supertest(innerServer.listener)
        .get(testRoute)
        .set(versionHeader, actualVersion)
        .expect(200, 'ok');
    });

    it('accepts requests that do not include a version header', async () => {
      await supertest(innerServer.listener).get(testRoute).expect(200, 'ok');
    });

    it('rejects requests with an incorrect version passed in the version header', async () => {
      await supertest(innerServer.listener)
        .get(testRoute)
        .set(versionHeader, 'invalid-version')
        .expect(400, /Browser client is out of date/);
    });
  });

  describe('customHeaders pre-response handler', () => {
    const testRoute = '/custom_headers/test/route';
    const testErrorRoute = '/custom_headers/test/error_route';

    beforeEach(async () => {
      router.get({ path: testRoute, validate: false }, (context, req, res) => {
        return res.ok({ body: 'ok' });
      });
      router.get({ path: testErrorRoute, validate: false }, (context, req, res) => {
        return res.badRequest({ body: 'bad request' });
      });
      await server.start();
    });

    it('adds the kbn-name header', async () => {
      const result = await supertest(innerServer.listener).get(testRoute).expect(200, 'ok');
      const headers = result.header as Record<string, string>;
      expect(headers).toEqual(
        expect.objectContaining({
          [nameHeader]: kibanaName,
        })
      );
    });

    it('adds the kbn-name header in case of error', async () => {
      const result = await supertest(innerServer.listener).get(testErrorRoute).expect(400);
      const headers = result.header as Record<string, string>;
      expect(headers).toEqual(
        expect.objectContaining({
          [nameHeader]: kibanaName,
        })
      );
    });

    it('adds the custom headers', async () => {
      const result = await supertest(innerServer.listener).get(testRoute).expect(200, 'ok');
      const headers = result.header as Record<string, string>;
      expect(headers).toEqual(expect.objectContaining({ 'some-header': 'some-value' }));
    });

    it('adds the custom headers in case of error', async () => {
      const result = await supertest(innerServer.listener).get(testErrorRoute).expect(400);
      const headers = result.header as Record<string, string>;
      expect(headers).toEqual(expect.objectContaining({ 'some-header': 'some-value' }));
    });
  });

  describe('xsrf post-auth handler', () => {
    const testPath = '/xsrf/test/route';
    const destructiveMethods = ['POST', 'PUT', 'DELETE'];
    const nonDestructiveMethods = ['GET', 'HEAD'];

    const getSupertest = (method: string, path: string): supertest.Test => {
      return (supertest(innerServer.listener) as any)[method.toLowerCase()](path) as supertest.Test;
    };

    beforeEach(async () => {
      router.get({ path: testPath, validate: false }, (context, req, res) => {
        return res.ok({ body: 'ok' });
      });

      destructiveMethods.forEach((method) => {
        ((router as any)[method.toLowerCase()] as RouteRegistrar<any>)<any, any, any>(
          { path: testPath, validate: false },
          (context, req, res) => {
            return res.ok({ body: 'ok' });
          }
        );
        ((router as any)[method.toLowerCase()] as RouteRegistrar<any>)<any, any, any>(
          { path: allowlistedTestPath, validate: false },
          (context, req, res) => {
            return res.ok({ body: 'ok' });
          }
        );
        ((router as any)[method.toLowerCase()] as RouteRegistrar<any>)<any, any, any>(
          { path: xsrfDisabledTestPath, validate: false, options: { xsrfRequired: false } },
          (context, req, res) => {
            return res.ok({ body: 'ok' });
          }
        );
      });

      await server.start();
    });

    nonDestructiveMethods.forEach((method) => {
      describe(`When using non-destructive ${method} method`, () => {
        it('accepts requests without a token', async () => {
          await getSupertest(method.toLowerCase(), testPath).expect(
            200,
            method === 'HEAD' ? undefined : 'ok'
          );
        });

        it('accepts requests with the xsrf header', async () => {
          await getSupertest(method.toLowerCase(), testPath)
            .set(xsrfHeader, 'anything')
            .expect(200, method === 'HEAD' ? undefined : 'ok');
        });
      });
    });

    destructiveMethods.forEach((method) => {
      describe(`When using destructive ${method} method`, () => {
        it('accepts requests with the xsrf header', async () => {
          await getSupertest(method.toLowerCase(), testPath)
            .set(xsrfHeader, 'anything')
            .expect(200, 'ok');
        });

        it('accepts requests with the version header', async () => {
          await getSupertest(method.toLowerCase(), testPath)
            .set(versionHeader, actualVersion)
            .expect(200, 'ok');
        });

        it('rejects requests without either an xsrf or version header', async () => {
          await getSupertest(method.toLowerCase(), testPath).expect(400, {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Request must contain a kbn-xsrf header.',
          });
        });

        it('accepts whitelisted requests without either an xsrf or version header', async () => {
          await getSupertest(method.toLowerCase(), allowlistedTestPath).expect(200, 'ok');
        });

        it('accepts requests on a route with disabled xsrf protection', async () => {
          await getSupertest(method.toLowerCase(), xsrfDisabledTestPath).expect(200, 'ok');
        });
      });
    });
  });
});
