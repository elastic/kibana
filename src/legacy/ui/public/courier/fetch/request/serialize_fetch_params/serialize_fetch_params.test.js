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

import { serializeFetchParams } from './serialize_fetch_params';
import _ from 'lodash';

const DEFAULT_SESSION_ID = '1';

function serializeFetchParamsWithDefaults(paramOverrides) {
  const paramDefaults = {
    requestFetchParams: [],
    Promise,
    sessionId: DEFAULT_SESSION_ID,
    config: {
      get: () => {
        return 'sessionId';
      }
    },
    timeout: 100,
  };
  const params = { ...paramDefaults, ...paramOverrides };

  return serializeFetchParams(
    params.requestFetchParams,
    Promise,
    params.sessionId,
    params.config,
    params.timeout,
  );
}

describe('when indexList is not empty', () => {
  test('includes the index', () => {
    const requestFetchParams = [
      {
        index: ['logstash-123'],
        type: 'blah',
        search_type: 'blah2',
        body: { foo: 'bar', $foo: 'bar' }
      }
    ];
    return serializeFetchParamsWithDefaults({ requestFetchParams }).then(value => {
      expect(_.includes(value, '"index":["logstash-123"]')).toBe(true);
    });
  });
});

describe('headers', () => {

  const requestFetchParams = [
    {
      index: ['logstash-123'],
      type: 'blah',
      search_type: 'blah2',
      body: { foo: 'bar' }
    }
  ];

  const getHeader = async (paramOverrides) => {
    const request = await serializeFetchParamsWithDefaults(paramOverrides);
    const requestParts = request.split('\n');
    if (requestParts.length < 2) {
      throw new Error('fetch Body does not contain expected format header newline body.');
    }
    return JSON.parse(requestParts[0]);
  };

  describe('search request preference', async () => {
    test('should be set to sessionId when courier:setRequestPreference is "sessionId"', async () => {
      const config = {
        get: () => {
          return 'sessionId';
        }
      };
      const header = await getHeader({ requestFetchParams, config });
      expect(header.preference).toBe(DEFAULT_SESSION_ID);
    });

    test('should be set to custom string when courier:setRequestPreference is "custom"', async () => {
      const CUSTOM_PREFERENCE = '_local';
      const config = {
        get: (key) => {
          if (key === 'courier:setRequestPreference') {
            return 'custom';
          } else if (key === 'courier:customRequestPreference') {
            return CUSTOM_PREFERENCE;
          }
        }
      };
      const header = await getHeader({ requestFetchParams, config });
      expect(header.preference).toBe(CUSTOM_PREFERENCE);
    });

    test('should not be set when courier:setRequestPreference is "none"', async () => {
      const config = {
        get: () => {
          return 'none';
        }
      };
      const header = await getHeader({ requestFetchParams, config });
      expect(header.preference).toBe(undefined);
    });
  });
});

describe('body', () => {
  const requestFetchParams = [
    {
      index: ['logstash-123'],
      type: 'blah',
      search_type: 'blah2',
      body: { foo: 'bar' }
    }
  ];

  const getBody = async (paramOverrides) => {
    const request = await serializeFetchParamsWithDefaults(paramOverrides);
    const requestParts = request.split('\n');
    if (requestParts.length < 2) {
      throw new Error('fetch Body does not contain expected format: header newline body.');
    }
    return JSON.parse(requestParts[1]);
  };

  describe('timeout', () => {
    test('should set a timeout as specified', async () => {
      const request = await getBody({ requestFetchParams, timeout: 200 });
      expect(request).toHaveProperty('timeout', '200ms');
    });

    test('should not set a timeout when timeout is 0', async () => {
      const request = await getBody({ requestFetchParams, timeout: 0 });
      expect(request).not.toHaveProperty('timeout');
    });
  });
});
