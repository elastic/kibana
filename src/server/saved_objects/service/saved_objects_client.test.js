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
    create: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const attributes = Symbol();
  const options = Symbol();
  const namespace = Symbol();
  const result = await client.create(type, attributes, options, namespace);

  expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options, namespace);
  expect(result).toBe(returnValue);
});

test(`#bulkCreate`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkCreate: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const namespace = Symbol();
  const result = await client.bulkCreate(objects, options, namespace);

  expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options, namespace);
  expect(result).toBe(returnValue);
});

test(`#delete`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    delete: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const namespace = Symbol();
  const result = await client.delete(type, id, namespace);

  expect(mockRepository.delete).toHaveBeenCalledWith(type, id, namespace);
  expect(result).toBe(returnValue);
});

test(`#find`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    find: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const options = Symbol();
  const namespace = Symbol();
  const result = await client.find(options, namespace);

  expect(mockRepository.find).toHaveBeenCalledWith(options, namespace);
  expect(result).toBe(returnValue);
});

test(`#bulkGet`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkGet: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const namespace = Symbol();
  const result = await client.bulkGet(objects, namespace);

  expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects, namespace);
  expect(result).toBe(returnValue);
});

test(`#get`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    get: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const namespace = Symbol();
  const result = await client.get(type, id, namespace);

  expect(mockRepository.get).toHaveBeenCalledWith(type, id, namespace);
  expect(result).toBe(returnValue);
});

test(`#update`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    update: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const attributes = Symbol();
  const options = Symbol();
  const namespace = Symbol();
  const result = await client.update(type, id, attributes, options, namespace);

  expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options, namespace);
  expect(result).toBe(returnValue);
});
