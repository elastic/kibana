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

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { __newPlatformSetup__, kfetch } from '../kfetch';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { HttpService } from '../../../../core/public/http';
import { fatalErrorsServiceMock } from '../../../../core/public/fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../../../../core/public/injected_metadata/injected_metadata_service.mock';
import { BasePathService } from '../../../../core/public/base_path';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import { isAutoCreateIndexError } from './error_auto_create_index';

function setupService() {
  const httpService = new HttpService();
  const fatalErrors = fatalErrorsServiceMock.createSetupContract();
  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();

  injectedMetadata.getBasePath.mockReturnValue('http://localhost/myBase');

  const basePath = new BasePathService().setup({ injectedMetadata });
  const http = httpService.setup({ basePath, fatalErrors, injectedMetadata });

  return { httpService, fatalErrors, http };
}

describe('isAutoCreateIndexError correctly handles KFetchError thrown by kfetch', () => {
  beforeAll(() => {
    __newPlatformSetup__(setupService().http);
  });

  describe('404', () => {
    beforeEach(() => {
      fetchMock.post({
        matcher: '*',
        response: {
          status: 404,
        },
      });
    });
    afterEach(() => fetchMock.restore());

    test('should return false', async () => {
      expect.assertions(1);
      try {
        await kfetch({ method: 'POST', pathname: '/my/path' });
      } catch (kfetchError) {
        expect(isAutoCreateIndexError(kfetchError)).toBe(false);
      }
    });
  });

  describe('503 error that is not ES_AUTO_CREATE_INDEX_ERROR', () => {
    beforeEach(() => {
      fetchMock.post({
        matcher: '*',
        response: {
          status: 503,
        },
      });
    });
    afterEach(() => fetchMock.restore());

    test('should return false', async () => {
      expect.assertions(1);
      try {
        await kfetch({ method: 'POST', pathname: '/my/path' });
      } catch (kfetchError) {
        expect(isAutoCreateIndexError(kfetchError)).toBe(false);
      }
    });
  });

  describe('503 error that is ES_AUTO_CREATE_INDEX_ERROR', () => {
    beforeEach(() => {
      fetchMock.post({
        matcher: '*',
        response: {
          body: {
            code: 'ES_AUTO_CREATE_INDEX_ERROR',
          },
          status: 503,
        },
      });
    });
    afterEach(() => fetchMock.restore());

    test('should return true', async () => {
      expect.assertions(1);
      try {
        await kfetch({ method: 'POST', pathname: '/my/path' });
      } catch (kfetchError) {
        expect(isAutoCreateIndexError(kfetchError)).toBe(true);
      }
    });
  });
});
