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

// eslint-disable-next-line max-classes-per-file
import { IndexPatterns } from './index_patterns';
import { SavedObjectsClientContract, IUiSettingsClient, HttpSetup } from 'kibana/public';

jest.mock('./index_pattern', () => {
  class IndexPattern {
    init = async () => {
      return this;
    };
  }

  return {
    IndexPattern,
  };
});

jest.mock('./index_patterns_api_client', () => {
  class IndexPatternsApiClient {
    getFieldsForWildcard = async () => ({});
  }

  return {
    IndexPatternsApiClient,
  };
});

describe('IndexPatterns', () => {
  let indexPatterns: IndexPatterns;

  beforeEach(() => {
    const savedObjectsClient = {} as SavedObjectsClientContract;
    const uiSettings = {} as IUiSettingsClient;
    const http = {} as HttpSetup;

    indexPatterns = new IndexPatterns(uiSettings, savedObjectsClient, http);
  });

  test('does cache gets for the same id', async () => {
    const id = '1';
    const indexPattern = await indexPatterns.get(id);

    expect(indexPattern).toBeDefined();
    expect(indexPattern).toBe(await indexPatterns.get(id));
  });
});
