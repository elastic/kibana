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

import supertest from 'supertest';
import { Request, ResponseToolkit } from 'hapi';
import Joi from 'joi';

import { defaultValidationErrorHandler, HapiValidationError } from './http_tools';
import { HttpServer } from './http_server';
import { HttpConfig } from './http_config';
import { Router } from './router';
import { loggingServiceMock } from '../logging/logging_service.mock';
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
  const logger = loggingServiceMock.create();
  const server = new HttpServer(logger, 'foo');

  test('closes sockets on timeout', async () => {
    const router = new Router('');
    router.get({ path: '/a', validate: false }, async (req, res) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return res.ok({});
    });
    router.get({ path: '/b', validate: false }, (req, res) => res.ok({}));

    const { registerRouter, server: innerServer } = await server.setup({
      socketTimeout: 1000,
      host: '127.0.0.1',
      maxPayload: new ByteSizeValue(1024),
      ssl: {},
    } as HttpConfig);
    registerRouter(router);

    await server.start();

    expect(supertest(innerServer.listener).get('/a')).rejects.toThrow('socket hang up');

    await supertest(innerServer.listener)
      .get('/b')
      .expect(200);
  });

  afterAll(async () => {
    await server.stop();
  });
});
