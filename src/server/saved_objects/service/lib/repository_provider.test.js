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

import { SavedObjectsRepositoryProvider } from './repository_provider';

test('requires "callCluster" to be provided', () => {
  const provider = new SavedObjectsRepositoryProvider({
    index: 'idx',
    mappings: {
      foo: {}
    },
    onBeforeWrite: jest.fn()
  });

  expect(() => provider.getRepository({})).toThrowErrorMatchingSnapshot();
});

test('uses defaults provided at provider construction time', async () => {
  const defaultProperties = {
    index: 'default-index',
    mappings: {
      foo: {
        properties: {
          field: { type: 'string' }
        }
      }
    },
    onBeforeWrite: jest.fn()
  };

  const provider = new SavedObjectsRepositoryProvider(defaultProperties);

  const callCluster = jest.fn().mockReturnValue({
    _id: 'new'
  });

  const repository = provider.getRepository({
    callCluster
  });

  await repository.create('foo', {});

  expect(callCluster).toHaveBeenCalledTimes(1);
  expect(defaultProperties.onBeforeWrite).toHaveBeenCalledTimes(1);
  expect(callCluster).toHaveBeenCalledWith('index', expect.objectContaining({
    index: defaultProperties.index
  }));
});

test('overrides provider defaults with per-repository settings when given', async () => {
  const defaultProperties = {
    index: 'default-index',
    mappings: {
      foo: {
        properties: {
          field: { type: 'string' }
        }
      }
    },
    onBeforeWrite: jest.fn()
  };

  const provider = new SavedObjectsRepositoryProvider(defaultProperties);

  const overrideProperties = {
    index: 'other-index',
    onBeforeWrite: jest.fn()
  };

  const callCluster = jest.fn().mockReturnValue({
    _id: 'new'
  });

  const repository = provider.getRepository({
    ...overrideProperties,
    callCluster
  });

  await repository.create('foo', {});

  expect(callCluster).toHaveBeenCalledTimes(1);

  expect(defaultProperties.onBeforeWrite).toHaveBeenCalledTimes(0);
  expect(overrideProperties.onBeforeWrite).toHaveBeenCalledTimes(1);

  expect(callCluster).toHaveBeenCalledWith('index', expect.objectContaining({
    index: overrideProperties.index
  }));
});
