/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    // Hapi Inert patches native methods
    ...original,
    readFileSync: jest.fn(),
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

import supertest from 'supertest';
import { Request, ResponseToolkit } from 'hapi';
import Joi from 'joi';

import {
  defaultValidationErrorHandler,
  HapiValidationError,
  getServerOptions,
  getRequestId,
} from './http_tools';
import { HttpServer } from './http_server';
import { HttpConfig, config } from './http_config';
import { Router } from './router';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { ByteSizeValue } from '@kbn/config-schema';

const emptyOutput = {
  statusCode: 400,
  headers: {},
  payload: {
    statusCode: 400,
    error: '',
    validation: {
      source: '',
      keys: [],
    },
  },
};

afterEach(() => jest.clearAllMocks());

describe('defaultValidationErrorHandler', () => {
  it('formats value validation errors correctly', () => {
    expect.assertions(1);
    const schema = Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
      }).required()
    );

    const error = schema.validate([{}], { abortEarly: false }).error as HapiValidationError;

    // Emulate what Hapi v17 does by default
    error.output = { ...emptyOutput };
    error.output.payload.validation.keys = ['0.type', ''];

    try {
      defaultValidationErrorHandler({} as Request, {} as ResponseToolkit, error);
    } catch (err) {
      // Verify the empty string gets corrected to 'value'
      expect(err.output.payload.validation.keys).toEqual(['0.type', 'value']);
    }
  });
});

describe('timeouts', () => {
  const logger = loggingSystemMock.create();
  const server = new HttpServer(logger, 'foo');
  const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

  test('closes sockets on timeout', async () => {
    const router = new Router('', logger.get(), enhanceWithContext);
    router.get({ path: '/a', validate: false }, async (context, req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return res.ok({});
    });
    router.get({ path: '/b', validate: false }, (context, req, res) => res.ok({}));
    const { registerRouter, server: innerServer } = await server.setup({
      socketTimeout: 1000,
      host: '127.0.0.1',
      maxPayload: new ByteSizeValue(1024),
      ssl: {},
      compression: { enabled: true },
      requestId: {
        allowFromAnyIp: true,
        ipAllowlist: [],
      },
    } as any);
    registerRouter(router);

    await server.start();

    expect(supertest(innerServer.listener).get('/a')).rejects.toThrow('socket hang up');

    await supertest(innerServer.listener).get('/b').expect(200);
  });

  afterAll(async () => {
    await server.stop();
  });
});

describe('getServerOptions', () => {
  beforeEach(() =>
    jest.requireMock('fs').readFileSync.mockImplementation((path: string) => `content-${path}`)
  );

  it('properly configures TLS with default options', () => {
    const httpConfig = new HttpConfig(
      config.schema.validate({
        ssl: {
          enabled: true,
          key: 'some-key-path',
          certificate: 'some-certificate-path',
        },
      }),
      {} as any
    );

    expect(getServerOptions(httpConfig).tls).toMatchInlineSnapshot(`
      Object {
        "ca": undefined,
        "cert": "content-some-certificate-path",
        "ciphers": "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA",
        "honorCipherOrder": true,
        "key": "content-some-key-path",
        "passphrase": undefined,
        "rejectUnauthorized": false,
        "requestCert": false,
        "secureOptions": 67108864,
      }
    `);
  });

  it('properly configures TLS with client authentication', () => {
    const httpConfig = new HttpConfig(
      config.schema.validate({
        ssl: {
          enabled: true,
          key: 'some-key-path',
          certificate: 'some-certificate-path',
          certificateAuthorities: ['ca-1', 'ca-2'],
          clientAuthentication: 'required',
        },
      }),
      {} as any
    );

    expect(getServerOptions(httpConfig).tls).toMatchInlineSnapshot(`
      Object {
        "ca": Array [
          "content-ca-1",
          "content-ca-2",
        ],
        "cert": "content-some-certificate-path",
        "ciphers": "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA",
        "honorCipherOrder": true,
        "key": "content-some-key-path",
        "passphrase": undefined,
        "rejectUnauthorized": true,
        "requestCert": true,
        "secureOptions": 67108864,
      }
    `);
  });
});

describe('getRequestId', () => {
  describe('when allowFromAnyIp is true', () => {
    it('generates a UUID if no x-opaque-id header is present', () => {
      const request = {
        headers: {},
        raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
      } as any;
      expect(getRequestId(request, { allowFromAnyIp: true, ipAllowlist: [] })).toEqual(
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      );
    });

    it('uses x-opaque-id header value if present', () => {
      const request = {
        headers: {
          'x-opaque-id': 'id from header',
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        },
      } as any;
      expect(getRequestId(request, { allowFromAnyIp: true, ipAllowlist: [] })).toEqual(
        'id from header'
      );
    });
  });

  describe('when allowFromAnyIp is false', () => {
    describe('and ipAllowlist is empty', () => {
      it('generates a UUID even if x-opaque-id header is present', () => {
        const request = {
          headers: { 'x-opaque-id': 'id from header' },
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: [] })).toEqual(
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
      });
    });

    describe('and ipAllowlist is not empty', () => {
      it('uses x-opaque-id header if request comes from trusted IP address', () => {
        const request = {
          headers: { 'x-opaque-id': 'id from header' },
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: ['1.1.1.1'] })).toEqual(
          'id from header'
        );
      });

      it('generates a UUID if request comes from untrusted IP address', () => {
        const request = {
          headers: { 'x-opaque-id': 'id from header' },
          raw: { req: { socket: { remoteAddress: '5.5.5.5' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: ['1.1.1.1'] })).toEqual(
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
      });

      it('generates UUID if request comes from trusted IP address but no x-opaque-id header is present', () => {
        const request = {
          headers: {},
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: ['1.1.1.1'] })).toEqual(
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
      });
    });
  });
});
