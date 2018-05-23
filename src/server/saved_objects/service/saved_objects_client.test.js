import { SavedObjectsClient } from './saved_objects_client';

test(`#create`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    create: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const attributes = {};
  const options = {};
  const result = await client.create(type, attributes, options);

  expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
  expect(result).toBe(returnValue);
});

test(`#bulkCreate`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkCreate: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = [];
  const options = {};
  const result = await client.bulkCreate(objects, options);

  expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#delete`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    delete: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const id = 1;
  const result = await client.delete(type, id);

  expect(mockRepository.delete).toHaveBeenCalledWith(type, id);
  expect(result).toBe(returnValue);
});

test(`#find`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    find: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const options = {};
  const result = await client.find(options);

  expect(mockRepository.find).toHaveBeenCalledWith(options);
  expect(result).toBe(returnValue);
});

test(`#bulkGet`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkGet: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = {};
  const result = await client.bulkGet(objects);

  expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects);
  expect(result).toBe(returnValue);
});

test(`#get`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    get: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const id = 1;
  const result = await client.get(type, id);

  expect(mockRepository.get).toHaveBeenCalledWith(type, id);
  expect(result).toBe(returnValue);
});

test(`#update`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    update: jest.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const id = 1;
  const attributes = {};
  const options = {};
  const result = await client.update(type, id, attributes, options);

  expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
  expect(result).toBe(returnValue);
});
