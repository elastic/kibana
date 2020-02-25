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

import { SavedObjectsClient } from './saved_objects_client';

test(`#create`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    create: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const attributes = Symbol();
  const options = Symbol();
  const result = await client.create(type, attributes, options);

  expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
  expect(result).toBe(returnValue);
});

test(`#bulkCreate`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkCreate: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.bulkCreate(objects, options);

  expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#delete`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    delete: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const options = Symbol();
  const result = await client.delete(type, id, options);

  expect(mockRepository.delete).toHaveBeenCalledWith(type, id, options);
  expect(result).toBe(returnValue);
});

test(`#find`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    find: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const options = Symbol();
  const result = await client.find(options);

  expect(mockRepository.find).toHaveBeenCalledWith(options);
  expect(result).toBe(returnValue);
});

test(`#bulkGet`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkGet: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.bulkGet(objects, options);

  expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#get`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    get: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const options = Symbol();
  const result = await client.get(type, id, options);

  expect(mockRepository.get).toHaveBeenCalledWith(type, id, options);
  expect(result).toBe(returnValue);
});

test(`#update`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    update: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const attributes = Symbol();
  const options = Symbol();
  const result = await client.update(type, id, attributes, options);

  expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
  expect(result).toBe(returnValue);
});

test(`#bulkUpdate`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkUpdate: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const attributes = Symbol();
  const version = Symbol();
  const namespace = Symbol();
  const result = await client.bulkUpdate([{ type, id, attributes, version }], { namespace });

  expect(mockRepository.bulkUpdate).toHaveBeenCalledWith([{ type, id, attributes, version }], {
    namespace,
  });
  expect(result).toBe(returnValue);
});
