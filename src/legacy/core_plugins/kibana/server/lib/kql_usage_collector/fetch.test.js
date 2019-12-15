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

jest.mock('../../../ui_setting_defaults', () => ({
  getUiSettingDefaults: () => ({ 'search:queryLanguage': { value: 'lucene' } }),
}));

import { fetchProvider } from './fetch';

let fetch;
let callCluster;

function setupMockCallCluster(optCount, language) {
  callCluster = jest.fn((method, params) => {
    if ('id' in params && params.id === 'kql-telemetry:kql-telemetry') {
      if (optCount === null) {
        return Promise.resolve({
          _index: '.kibana_1',
          _id: 'kql-telemetry:kql-telemetry',
          found: false,
        });
      } else {
        return Promise.resolve({
          _source: {
            'kql-telemetry': {
              ...optCount,
            },
            type: 'kql-telemetry',
            updated_at: '2018-10-05T20:20:56.258Z',
          },
        });
      }
    } else if ('body' in params && params.body.query.term.type === 'config') {
      if (language === 'missingConfigDoc') {
        Promise.resolve({
          hits: {
            hits: [],
          },
        });
      } else {
        return Promise.resolve({
          hits: {
            hits: [
              {
                _source: {
                  config: {
                    'search:queryLanguage': language,
                  },
                },
              },
            ],
          },
        });
      }
    }
  });
}

describe('makeKQLUsageCollector', () => {
  describe('fetch method', () => {
    beforeEach(() => {
      fetch = fetchProvider('.kibana');
    });

    it('should return opt in data from the .kibana/kql-telemetry doc', async () => {
      setupMockCallCluster({ optInCount: 1 }, 'kuery');
      const fetchResponse = await fetch(callCluster);
      expect(fetchResponse.optInCount).toBe(1);
      expect(fetchResponse.optOutCount).toBe(0);
    });

    it('should return the default query language set in advanced settings', async () => {
      setupMockCallCluster({ optInCount: 1 }, 'kuery');
      const fetchResponse = await fetch(callCluster);
      expect(fetchResponse.defaultQueryLanguage).toBe('kuery');
    });

    // Indicates the user has modified the setting at some point but the value is currently the default
    it('should return the kibana default query language if the config value is null', async () => {
      setupMockCallCluster({ optInCount: 1 }, null);
      const fetchResponse = await fetch(callCluster);
      expect(fetchResponse.defaultQueryLanguage).toBe('lucene');
    });

    it('should indicate when the default language has never been modified by the user', async () => {
      setupMockCallCluster({ optInCount: 1 }, undefined);
      const fetchResponse = await fetch(callCluster);
      expect(fetchResponse.defaultQueryLanguage).toBe('default-lucene');
    });

    it('should default to 0 opt in counts if the .kibana/kql-telemetry doc does not exist', async () => {
      setupMockCallCluster(null, 'kuery');
      const fetchResponse = await fetch(callCluster);
      expect(fetchResponse.optInCount).toBe(0);
      expect(fetchResponse.optOutCount).toBe(0);
    });

    it('should default to the kibana default language if the config document does not exist', async () => {
      setupMockCallCluster(null, 'missingConfigDoc');
      const fetchResponse = await fetch(callCluster);
      expect(fetchResponse.defaultQueryLanguage).toBe('default-lucene');
    });
  });
});
