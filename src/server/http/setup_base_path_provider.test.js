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
import { setupBasePathProvider } from './setup_base_path_provider';

describe('setupBasePathProvider', () => {
  it('registers two request decorations', () => {
    const configValues = {};

    const server = {
      decorate: jest.fn()
    };

    const config = {
      get: jest.fn(() => configValues)
    };

    setupBasePathProvider(server, config);

    expect(server.decorate).toHaveBeenCalledTimes(2);
    expect(server.decorate).toHaveBeenCalledWith('request', 'getBasePath', expect.any(Function));
    expect(server.decorate).toHaveBeenCalledWith('request', 'setBasePath', expect.any(Function));
  });

  describe('getBasePath/setBasePath', () => {

    const defaultSetupFn = () => {
      return;
    };

    let request;
    const teardowns = [];

    beforeEach(() => {
      request = async (url, serverConfig = {}, setupFn = defaultSetupFn) => {
        const server = new Server();
        server.connection({ port: 0 });

        server.route({
          path: '/',
          method: 'GET',
          handler(req, reply) {
            setupFn(req, reply);
            return reply({ basePath: req.getBasePath() });
          }
        });

        setupBasePathProvider(server, {
          get: (key) => serverConfig[key]
        });

        teardowns.push(() => server.stop());

        return server.inject({
          method: 'GET',
          url,
        });
      };
    });

    afterEach(async () => {
      await Promise.all(teardowns.splice(0).map(fn => fn()));
    });


    it('should return an empty string when server.basePath is not set', async () => {
      const response = await request('/', {
        ['server.basePath']: ''
      });

      const { statusCode, payload } = response;

      expect(statusCode).toEqual(200);
      expect(JSON.parse(payload)).toEqual({
        basePath: ''
      });
    });

    it('should return the server.basePath unmodified when request.setBasePath is not called', async () => {
      const response = await request('/', {
        ['server.basePath']: '/path'
      });

      const { statusCode, payload } = response;

      expect(statusCode).toEqual(200);
      expect(JSON.parse(payload)).toEqual({
        basePath: '/path'
      });
    });

    it('should add the request basePath to the server.basePath', async () => {
      const response = await request('/', {
        ['server.basePath']: '/path'
      }, (req) => {
        req.setBasePath('/request/base/path');
      });

      const { statusCode, payload } = response;

      expect(statusCode).toEqual(200);
      expect(JSON.parse(payload)).toEqual({
        basePath: '/path/request/base/path'
      });
    });

    it('should not allow request.setBasePath to be called more than once', async () => {
      const response = request('/', {
        ['server.basePath']: '/path'
      }, (req) => {
        req.setBasePath('/request/base/path');
        req.setBasePath('/request/base/path/again');
      });

      expect(response).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});