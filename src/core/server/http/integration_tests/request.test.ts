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

import { HttpService } from '../http_service';

import { contextServiceMock } from '../../context/context_service.mock';
import { loggingServiceMock } from '../../logging/logging_service.mock';
import { createHttpServer } from '../test_utils';

let server: HttpService;

let logger: ReturnType<typeof loggingServiceMock.create>;
const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
};

beforeEach(() => {
  logger = loggingServiceMock.create();

  server = createHttpServer({ logger });
});

afterEach(async () => {
  await server.stop();
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
describe('KibanaRequest', () => {
  describe('events', () => {
    describe('aborted$', () => {
      it('emits once and completes when request aborted', async done => {
        expect.assertions(1);
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        const nextSpy = jest.fn();
        router.get({ path: '/', validate: false }, async (context, request, res) => {
          request.events.aborted$.subscribe({
            next: nextSpy,
            complete: () => {
              expect(nextSpy).toHaveBeenCalledTimes(1);
              done();
            },
          });

          // prevents the server to respond
          await delay(30000);
          return res.ok({ body: 'ok' });
        });

        await server.start();

        const incomingRequest = supertest(innerServer.listener)
          .get('/')
          // end required to send request
          .end();

        setTimeout(() => incomingRequest.abort(), 50);
      });

      it('completes & does not emit when request handled', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        const nextSpy = jest.fn();
        const completeSpy = jest.fn();
        router.get({ path: '/', validate: false }, async (context, request, res) => {
          request.events.aborted$.subscribe({
            next: nextSpy,
            complete: completeSpy,
          });

          return res.ok({ body: 'ok' });
        });

        await server.start();

        await supertest(innerServer.listener).get('/');

        expect(nextSpy).toHaveBeenCalledTimes(0);
        expect(completeSpy).toHaveBeenCalledTimes(1);
      });

      it('completes & does not emit when request rejected', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        const nextSpy = jest.fn();
        const completeSpy = jest.fn();
        router.get({ path: '/', validate: false }, async (context, request, res) => {
          request.events.aborted$.subscribe({
            next: nextSpy,
            complete: completeSpy,
          });

          return res.badRequest();
        });

        await server.start();

        await supertest(innerServer.listener).get('/');

        expect(nextSpy).toHaveBeenCalledTimes(0);
        expect(completeSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
