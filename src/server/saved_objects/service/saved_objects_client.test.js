import { SavedObjectsClient } from './saved_objects_client';

const createMockRepository = () => {
  return {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    bulkGet: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };
};

test(`#create`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const attributes = {};
  const options = {};
  client.create(type, attributes, options);

  expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
});

test(`#bulkCreate`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const objects = [];
  const options = {};
  client.bulkCreate(objects, options);

  expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
});

test(`#delete`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const id = 1;
  client.delete(type, id);

  expect(mockRepository.delete).toHaveBeenCalledWith(type, id);
});

test(`#find`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const options = {};
  client.find(options);

  expect(mockRepository.find).toHaveBeenCalledWith(options);
});

test(`#bulkGet`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const objects = {};
  client.bulkGet(objects);

  expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects);
});

test(`#get`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const id = 1;
  client.get(type, id);

  expect(mockRepository.get).toHaveBeenCalledWith(type, id);
});

test(`#update`, () => {
  const mockRepository = createMockRepository();
  const client = new SavedObjectsClient(mockRepository);

  const type = 'foo';
  const id = 1;
  const attributes = {};
  const options = {};
  client.update(type, id, attributes, options);

  expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
});
