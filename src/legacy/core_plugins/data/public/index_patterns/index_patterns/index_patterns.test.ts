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
import {
  SavedObjectsClientContract,
  UiSettingsClientContract,
  HttpServiceBase,
} from 'kibana/public';

jest.mock('../errors', () => ({
  IndexPatternMissingIndices: jest.fn(),
}));

jest.mock('ui/registry/field_formats', () => ({
  fieldFormats: {
    getDefaultInstance: jest.fn(),
  },
}));

jest.mock('ui/notify', () => ({
  toastNotifications: {
    addDanger: jest.fn(),
  },
}));

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
    const uiSettings = {} as UiSettingsClientContract;
    const http = {} as HttpServiceBase;

    indexPatterns = new IndexPatterns(uiSettings, savedObjectsClient, http);
  });

  test('does cache gets for the same id', () => {
    const id = '1';

    expect(indexPatterns.get(id)).toBe(indexPatterns.get(id));
  });
});
