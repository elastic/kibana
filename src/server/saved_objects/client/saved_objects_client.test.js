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
import { SavedObjectsRepository } from './lib/repository';
jest.mock('./lib/repository');

beforeEach(() => {
  SavedObjectsRepository.mockClear();
});

const setupMockRepository = (mock) => {
  SavedObjectsRepository.mockImplementation(() => mock);
  return mock;
};

test(`#constructor`, () => {
  const options = {};
  new SavedObjectsClient(options);
  expect(SavedObjectsRepository).toHaveBeenCalledWith(options);
});

test(`#create`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    create: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const type = 'foo';
  const attributes = {};
  const options = {};
  const result = await client.create(type, attributes, options);

  expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
  expect(result).toBe(returnValue);
});

test(`#bulkCreate`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    bulkCreate: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const objects = [];
  const options = {};
  const result = await client.bulkCreate(objects, options);

  expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#delete`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    delete: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const type = 'foo';
  const id = 1;
  const result = await client.delete(type, id);

  expect(mockRepository.delete).toHaveBeenCalledWith(type, id);
  expect(result).toBe(returnValue);
});

test(`#find`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    find: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const options = {};
  const result = await client.find(options);

  expect(mockRepository.find).toHaveBeenCalledWith(options);
  expect(result).toBe(returnValue);
});

test(`#bulkGet`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    bulkGet: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const objects = {};
  const result = await client.bulkGet(objects);

  expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects);
  expect(result).toBe(returnValue);
});

test(`#get`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    get: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const type = 'foo';
  const id = 1;
  const result = await client.get(type, id);

  expect(mockRepository.get).toHaveBeenCalledWith(type, id);
  expect(result).toBe(returnValue);
});

test(`#update`, async () => {
  const returnValue = Symbol();
  const mockRepository = setupMockRepository({
    update: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  });
  const client = new SavedObjectsClient();

  const type = 'foo';
  const id = 1;
  const attributes = {};
  const options = {};
  const result = await client.update(type, id, attributes, options);

  expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
  expect(result).toBe(returnValue);
});
