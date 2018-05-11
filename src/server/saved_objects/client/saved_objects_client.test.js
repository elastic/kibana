import { SavedObjectsClient } from './saved_objects_client';
import { SavedObjectsRepository } from './saved_objects_repository';
jest.mock('./saved_objects_repository');

let mockSavedObjectsRepository;
beforeEach(() => {
  mockSavedObjectsRepository = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    bulkGet: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  SavedObjectsRepository.mockClear();
  SavedObjectsRepository.mockImplementation(() => mockSavedObjectsRepository);
});

test(`#constructor`, () => {
  const options = {};
  new SavedObjectsClient(options);
  expect(SavedObjectsRepository).toHaveBeenCalledWith(options);
});

test(`#create`, () => {
  const client = new SavedObjectsClient();

  const type = 'foo';
  const attributes = {};
  const options = {};
  client.create(type, attributes, options);

  expect(mockSavedObjectsRepository.create).toHaveBeenCalledWith(type, attributes, options);
});

test(`#bulkCreate`, () => {
  const client = new SavedObjectsClient();

  const objects = [];
  const options = {};
  client.bulkCreate(objects, options);

  expect(mockSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
});

test(`#delete`, () => {
  const client = new SavedObjectsClient();

  const type = 'foo';
  const id = 1;
  client.delete(type, id);

  expect(mockSavedObjectsRepository.delete).toHaveBeenCalledWith(type, id);
});

test(`#find`, () => {
  const client = new SavedObjectsClient();

  const options = {};
  client.find(options);

  expect(mockSavedObjectsRepository.find).toHaveBeenCalledWith(options);
});

test(`#bulkGet`, () => {
  const client = new SavedObjectsClient();

  const objects = {};
  client.bulkGet(objects);

  expect(mockSavedObjectsRepository.bulkGet).toHaveBeenCalledWith(objects);
});

test(`#get`, () => {
  const client = new SavedObjectsClient();

  const type = 'foo';
  const id = 1;
  client.get(type, id);

  expect(mockSavedObjectsRepository.get).toHaveBeenCalledWith(type, id);
});

test(`#update`, () => {
  const client = new SavedObjectsClient();

  const type = 'foo';
  const id = 1;
  const attributes = {};
  const options = {};
  client.update(type, id, attributes, options);

  expect(mockSavedObjectsRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
});
