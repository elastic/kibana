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

import { IndexPatterns } from '../index_patterns';

jest.mock('../errors', () => ({
  IndexPatternMissingIndices: jest.fn(),
}));


jest.mock('../../registry/field_formats', () => ({
  fieldFormats: {
    getDefaultInstance: jest.fn(),
  }
}));

jest.mock('../../notify', () => ({
  Notifier: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
  })),
  toastNotifications: {
    addDanger: jest.fn(),
  }
}));


jest.mock('../_get', () => ({
  indexPatternsGetProvider: jest.fn().mockImplementation(() => {
    return () => {};
  })
}));

jest.mock('../_index_pattern', () => {
  class IndexPattern {
    init = async () => {
      return this;
    }
  }

  return {
    IndexPattern
  };
});

jest.mock('../index_patterns_api_client', () => {
  class IndexPatternsApiClient {
    getFieldsForWildcard = async () => ({})
  }

  return {
    IndexPatternsApiClient
  };
});

const savedObjectsClient = {
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn()
};

const config = {
  get: jest.fn(),
};


describe('IndexPatterns', () => {
  const indexPatterns = new IndexPatterns('', config, savedObjectsClient);

  it('does not cache gets without an id', function () {
    expect(indexPatterns.get()).not.toBe(indexPatterns.get());
  });

  it('does cache gets for the same id', function () {
    expect(indexPatterns.get(1)).toBe(indexPatterns.get(1));
  });
});
