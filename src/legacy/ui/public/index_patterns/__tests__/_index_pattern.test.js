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

import { IndexPatternProvider } from '../_index_pattern';

jest.mock('../../errors', () => ({
  SavedObjectNotFound: jest.fn(),
  DuplicateField: jest.fn(),
  IndexPatternMissingIndices: jest.fn(),
}));

jest.mock('../../registry/field_formats', () => ({
  fieldFormats: {
    getDefaultInstance: jest.fn(),
  }
}));

jest.mock('../../utils/mapping_setup', () => ({
  expandShorthand: jest.fn().mockImplementation(() => ({
    id: true,
    title: true,
  }))
}));

jest.mock('../../notify', () => ({
  Notifier: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
  })),
  toastNotifications: {
    addDanger: jest.fn(),
  }
}));

jest.mock('../_format_hit', () => ({
  formatHit: jest.fn().mockImplementation(() => ({
    formatField: jest.fn(),
  }))
}));

jest.mock('../_get', () => ({
  IndexPatternsGetProvider: jest.fn().mockImplementation(() => ({
    clearCache: jest.fn(),
  }))
}));

jest.mock('../_flatten_hit', () => ({
  IndexPatternsFlattenHitProvider: jest.fn(),
}));

jest.mock('../_pattern_cache', () => ({
  IndexPatternsPatternCacheProvider: {
    clear: jest.fn(),
  }
}));

jest.mock('../fields_fetcher_provider', () => ({
  FieldsFetcherProvider: {
    fetch: jest.fn().mockImplementation(() => ([]))
  }
}));


jest.mock('../../saved_objects', () => {
  const object = {
    _version: 'foo',
    _id: 'foo',
    attributes: {
      title: 'something'
    }
  };

  return {
    SavedObjectsClientProvider: {
      get: async () => object,
      update: async (type, id, body, { version }) => {
        if (object._version !== version) {
          throw {
            res: {
              status: 409
            }
          };
        }

        object.attributes.title = body.title;
        object._version += 'a';

        return {
          id: object._id,
          _version: object._version,
        };
      }
    },
    findObjectByTitle: jest.fn(),
  };
});

const Private = arg => arg;
const config = {
  get: jest.fn(),
  watchAll: jest.fn(),
};
const Promise = window.Promise;
const confirmModalPromise = jest.fn();
const kbnUrl = {
  eval: jest.fn(),
};
const i18n = arg => arg;

describe('IndexPattern', () => {
  it('should handle version conflicts', async () => {
    const IndexPattern = IndexPatternProvider(Private, config, Promise, confirmModalPromise, kbnUrl, i18n); // eslint-disable-line new-cap

    // Create a normal index pattern
    const pattern = new IndexPattern('foo');
    await pattern.init();

    expect(pattern.version).toBe('fooa');

    // Create the same one - we're going to handle concurrency
    const samePattern = new IndexPattern('foo');
    await samePattern.init();

    expect(samePattern.version).toBe('fooaa');

    // This will conflict because samePattern did a save (from refreshFields)
    // but the resave should work fine
    pattern.title = 'foo2';
    await pattern.save();

    // This should not be able to recover
    samePattern.title = 'foo3';

    let result;
    try {
      await samePattern.save();
    } catch (err) {
      result = err;
    }

    expect(result.res.status).toBe(409);
  });
});
