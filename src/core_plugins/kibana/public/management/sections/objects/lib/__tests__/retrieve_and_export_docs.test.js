import { retrieveAndExportDocs } from '../retrieve_and_export_docs';

jest.mock('../save_to_file', () => ({
  saveToFile: jest.fn(),
}));

jest.mock('ui/errors', () => ({
  SavedObjectNotFound: class SavedObjectNotFound extends Error {
    constructor(options) {
      super();
      for (const option in options) {
        if (options.hasOwnProperty(option)) {
          this[option] = options[option];
        }
      }
    }
  },
}));

jest.mock('ui/chrome', () => ({
  addBasePath: () => {},
}));

describe('retrieveAndExportDocs', () => {
  let saveToFile;

  beforeEach(() => {
    saveToFile = require('../save_to_file').saveToFile;
    saveToFile.mockClear();
  });

  it('should fetch all', async () => {
    const savedObjectsClient = {
      bulkGet: jest.fn().mockImplementation(() => ({
        savedObjects: [],
      })),
    };

    const objs = [1, 2, 3];
    await retrieveAndExportDocs(objs, savedObjectsClient);
    expect(savedObjectsClient.bulkGet.mock.calls.length).toBe(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(objs);
  });

  it('should use the saveToFile utility', async () => {
    const savedObjectsClient = {
      bulkGet: jest.fn().mockImplementation(() => ({
        savedObjects: [
          {
            id: 1,
            type: 'index-pattern',
            attributes: {
              title: 'foobar',
            },
          },
          {
            id: 2,
            type: 'search',
            attributes: {
              title: 'just the foo',
            },
          },
        ],
      })),
    };

    const objs = [1, 2, 3];
    await retrieveAndExportDocs(objs, savedObjectsClient);
    expect(saveToFile.mock.calls.length).toBe(1);
    expect(saveToFile).toHaveBeenCalledWith(
      JSON.stringify(
        [
          {
            _id: 1,
            _type: 'index-pattern',
            _source: { title: 'foobar' },
          },
          {
            _id: 2,
            _type: 'search',
            _source: { title: 'just the foo' },
          },
        ],
        null,
        2
      )
    );
  });
});
