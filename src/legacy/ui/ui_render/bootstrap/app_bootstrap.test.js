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

const mockTemplate = `
{{appId}}
{{regularBundlePath}}
`;

jest.mock('fs', () => ({
  readFile: jest.fn().mockImplementation((path, encoding, cb) => cb(null, mockTemplate)),
}));

import { AppBootstrap } from './app_bootstrap';

describe('ui_render/AppBootstrap', () => {
  describe('getJsFile()', () => {
    test('resolves to a string', async () => {
      expect.assertions(1);

      const bootstrap = new AppBootstrap(mockConfig());
      const contents = await bootstrap.getJsFile();

      expect(typeof contents).toEqual('string');
    });

    test('interpolates templateData into string template', async () => {
      expect.assertions(2);

      const bootstrap = new AppBootstrap(mockConfig());
      const contents = await bootstrap.getJsFile();

      expect(contents).toContain('123');
      expect(contents).toContain('/foo/bar');
    });
  });

  describe('getJsFileHash()', () => {
    test('resolves to a 40 character string', async () => {
      expect.assertions(2);

      const bootstrap = new AppBootstrap(mockConfig());
      const hash = await bootstrap.getJsFileHash();

      expect(typeof hash).toEqual('string');
      expect(hash).toHaveLength(40);
    });

    test('resolves to the same string for multiple calls with the same config on the same bootstrap object', async () => {
      expect.assertions(1);

      const bootstrap = new AppBootstrap(mockConfig());
      const hash1 = await bootstrap.getJsFileHash();
      const hash2 = await bootstrap.getJsFileHash();

      expect(hash2).toEqual(hash1);
    });

    test('resolves to the same string for multiple calls with the same config on different bootstrap objects', async () => {
      expect.assertions(1);

      const bootstrap1 = new AppBootstrap(mockConfig());
      const hash1 = await bootstrap1.getJsFileHash();

      const bootstrap2 = new AppBootstrap(mockConfig());
      const hash2 = await bootstrap2.getJsFileHash();

      expect(hash2).toEqual(hash1);
    });

    test('resolves to different 40 character string with different templateData', async () => {
      expect.assertions(3);

      const bootstrap1 = new AppBootstrap(mockConfig());
      const hash1 = await bootstrap1.getJsFileHash();

      const config2 = {
        ...mockConfig(),
        templateData: {
          appId: 'not123',
          regularBundlePath: 'not/foo/bar',
        },
      };
      const bootstrap2 = new AppBootstrap(config2);
      const hash2 = await bootstrap2.getJsFileHash();

      expect(typeof hash2).toEqual('string');
      expect(hash2).toHaveLength(40);
      expect(hash2).not.toEqual(hash1);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});

function mockConfig() {
  return {
    templateData: {
      appId: 123,
      regularBundlePath: '/foo/bar',
    },
  };
}
