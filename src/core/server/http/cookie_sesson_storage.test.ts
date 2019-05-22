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
import { Server } from 'hapi';
import request from 'request';

import { createCookieSessionStorageFactory } from './cookie_session_storage';

interface User {
  id: string;
  roles?: string[];
}

interface Storage {
  value: User;
  expires: number;
}

function retrieveSessionCookie(cookies: string) {
  const sessionCookie = request.cookie(cookies);
  if (!sessionCookie) {
    throw new Error('session cookie expected to be defined');
  }
  return sessionCookie;
}

const userData = { id: '42' };
const sessionDurationMs = 1000;
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: (session: Storage) => session.expires > Date.now(),
  isSecure: false,
  path: '/',
};

describe('Cookie based SessionStorage', () => {
  describe('#set()', () => {
    it('Should write to session storage & set cookies', async () => {
      const server = new Server();
      const factory = await createCookieSessionStorageFactory(server, cookieOptions);
      server.route({
        method: 'GET',
        path: '/set',
        options: {
          handler: (req, h) => {
            const sessionStorage = factory.asScoped(req);
            sessionStorage.set({ value: userData, expires: Date.now() + sessionDurationMs });
            return h.response();
          },
        },
      });

      const response = await server.inject('/set');
      expect(response.statusCode).toBe(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies).toHaveLength(1);

      const sessionCookie = retrieveSessionCookie(cookies[0]);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.key).toBe('sid');
      expect(sessionCookie.value).toBeDefined();
      expect(sessionCookie.path).toBe('/');
      expect(sessionCookie.httpOnly).toBe(true);
    });
  });
  describe('#get()', () => {
    it('Should read from session storage', async () => {
      const server = new Server();
      const factory = await createCookieSessionStorageFactory(server, cookieOptions);
      server.route({
        method: 'GET',
        path: '/get',
        options: {
          handler: async (req, h) => {
            const sessionStorage = factory.asScoped(req);
            const sessionValue = await sessionStorage.get();
            if (!sessionValue) {
              sessionStorage.set({ value: userData, expires: Date.now() + sessionDurationMs });
              return h.response();
            }
            return h.response(sessionValue.value);
          },
        },
      });

      const response = await server.inject('/get');
      expect(response.statusCode).toBe(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies).toHaveLength(1);

      const sessionCookie = retrieveSessionCookie(cookies[0]);

      const response2 = await server.inject({
        method: 'GET',
        url: '/get',
        headers: { cookie: `${sessionCookie.key}=${sessionCookie.value}` },
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.result).toEqual(userData);
    });
    it('Should return null for empty session', async () => {
      const server = new Server();
      const factory = await createCookieSessionStorageFactory(server, cookieOptions);
      server.route({
        method: 'GET',
        path: '/get-empty',
        options: {
          handler: async (req, h) => {
            const sessionStorage = factory.asScoped(req);
            const sessionValue = await sessionStorage.get();
            return h.response(JSON.stringify(sessionValue));
          },
        },
      });
      const response = await server.inject('/get-empty');
      expect(response.statusCode).toBe(200);
      expect(response.result).toBe('null');

      const cookies = response.headers['set-cookie'];
      expect(cookies).not.toBeDefined();
    });
    it('Should return null for invalid session & clean cookies', async () => {
      const server = new Server();
      const factory = await createCookieSessionStorageFactory(server, cookieOptions);
      let setOnce = false;
      server.route({
        method: 'GET',
        path: '/get-invalid',
        options: {
          handler: async (req, h) => {
            const sessionStorage = factory.asScoped(req);
            if (!setOnce) {
              setOnce = true;
              sessionStorage.set({ value: userData, expires: Date.now() + sessionDurationMs });
              return h.response();
            }
            const sessionValue = await sessionStorage.get();
            return h.response(JSON.stringify(sessionValue));
          },
        },
      });
      const response = await server.inject('/get-invalid');
      expect(response.statusCode).toBe(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      await delay(sessionDurationMs);

      const sessionCookie = retrieveSessionCookie(cookies[0]);
      const response2 = await server.inject({
        method: 'GET',
        url: '/get-invalid',
        headers: { cookie: `${sessionCookie.key}=${sessionCookie.value}` },
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.result).toBe('null');

      const cookies2 = response2.headers['set-cookie'];
      expect(cookies2).toEqual([
        'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
      ]);
    });
  });
  describe('#clear()', () => {
    it('Should clear session storage & remove cookies', async () => {
      const server = new Server();
      const factory = await createCookieSessionStorageFactory(server, cookieOptions);
      server.route({
        method: 'GET',
        path: '/clear',
        options: {
          handler: async (req, h) => {
            const sessionStorage = factory.asScoped(req);
            if (await sessionStorage.get()) {
              sessionStorage.clear();
              return h.response();
            }
            sessionStorage.set({ value: userData, expires: Date.now() + sessionDurationMs });
            return h.response();
          },
        },
      });
      const response = await server.inject('/clear');
      const cookies = response.headers['set-cookie'];

      const sessionCookie = retrieveSessionCookie(cookies[0]);

      const response2 = await server.inject({
        method: 'GET',
        url: '/clear',
        headers: { cookie: `${sessionCookie.key}=${sessionCookie.value}` },
      });
      expect(response2.statusCode).toBe(200);

      const cookies2 = response2.headers['set-cookie'];
      expect(cookies2).toEqual([
        'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
      ]);
    });
  });
});
