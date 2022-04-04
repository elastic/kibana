/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults } from 'lodash';
import { DataViewsService, DataView } from '.';
import { fieldFormatsMock } from '../../../field_formats/common/mocks';

import { UiSettingsCommon, SavedObjectsClientCommon, SavedObject } from '../types';
import { stubbedSavedObjectIndexPattern } from '../data_view.stub';
import { DEFAULT_ASSETS_TO_IGNORE } from '../constants';

const createFieldsFetcher = jest.fn().mockImplementation(() => ({
  getFieldsForWildcard: jest.fn().mockImplementation(() => {
    return new Promise((resolve) => resolve([]));
  }),
  every: jest.fn(),
}));

const fieldFormats = fieldFormatsMock;
let object: any = {};

function setDocsourcePayload(id: string | null, providedPayload: any) {
  object = defaults(providedPayload || {}, stubbedSavedObjectIndexPattern(id));
}

const savedObject = {
  id: 'id',
  version: 'version',
  attributes: {
    title: 'kibana-*',
    name: 'Kibana *',
    timeFieldName: '@timestamp',
    fields: '[]',
    sourceFilters: '[{"value":"item1"},{"value":"item2"}]',
    fieldFormatMap: '{"field":{}}',
    typeMeta: '{}',
    type: '',
    runtimeFieldMap:
      '{"aRuntimeField": { "type": "keyword", "script": {"source": "emit(\'hello\')"}}}',
    fieldAttrs: '{"aRuntimeField": { "count": 5, "customLabel": "A Runtime Field"}}',
  },
  type: 'index-pattern',
  references: [],
};

describe('IndexPatterns', () => {
  let indexPatterns: DataViewsService;
  let indexPatternsNoAccess: DataViewsService;
  let savedObjectsClient: SavedObjectsClientCommon;
  let SOClientGetDelay = 0;
  const uiSettings = {
    get: () => Promise.resolve(false),
    getAll: () => {},
    set: jest.fn(),
    remove: jest.fn(),
  } as any as UiSettingsCommon;
  const indexPatternObj = { id: 'id', version: 'a', attributes: { title: 'title' } };

  beforeEach(() => {
    savedObjectsClient = {} as SavedObjectsClientCommon;
    savedObjectsClient.find = jest.fn(
      () => Promise.resolve([indexPatternObj]) as Promise<Array<SavedObject<any>>>
    );
    savedObjectsClient.delete = jest.fn(() => Promise.resolve({}) as Promise<any>);
    savedObjectsClient.create = jest.fn();
    savedObjectsClient.get = jest.fn().mockImplementation(async (type, id) => {
      await new Promise((resolve) => setTimeout(resolve, SOClientGetDelay));
      return {
        id: object.id,
        version: object.version,
        attributes: object.attributes,
      };
    });
    savedObjectsClient.update = jest
      .fn()
      .mockImplementation(async (type, id, body, { version }) => {
        if (object.version !== version) {
          throw new Object({
            res: {
              status: 409,
            },
          });
        }
        object.attributes.title = body.title;
        object.version += 'a';
        return {
          id: object.id,
          version: object.version,
        };
      });

    indexPatterns = new DataViewsService({
      uiSettings,
      savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientCommon,
      apiClient: createFieldsFetcher(),
      fieldFormats,
      onNotification: () => {},
      onError: () => {},
      onRedirectNoIndexPattern: () => {},
      getCanSave: () => Promise.resolve(true),
    });

    indexPatternsNoAccess = new DataViewsService({
      uiSettings,
      savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientCommon,
      apiClient: createFieldsFetcher(),
      fieldFormats,
      onNotification: () => {},
      onError: () => {},
      onRedirectNoIndexPattern: () => {},
      getCanSave: () => Promise.resolve(false),
    });
  });

  test('does cache gets for the same id', async () => {
    SOClientGetDelay = 1000;
    const id = '1';
    setDocsourcePayload(id, {
      id: 'foo',
      version: 'foo',
      attributes: {
        title: 'something',
      },
    });

    // make two requests before first can complete
    const indexPatternPromise = indexPatterns.get(id);
    indexPatterns.get(id);

    indexPatternPromise.then((indexPattern) => {
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(indexPattern).toBeDefined();
    });

    expect(await indexPatternPromise).toBe(await indexPatterns.get(id));
    SOClientGetDelay = 0;
  });

  test('allowNoIndex flag preserves existing fields when index is missing', async () => {
    const id = '2';
    setDocsourcePayload(id, {
      id: 'foo',
      version: 'foo',
      attributes: {
        title: 'something',
        allowNoIndex: true,
        fields: '[{"name":"field"}]',
      },
    });

    expect((await indexPatterns.get(id)).fields.length).toBe(1);
  });

  test('savedObjectCache pre-fetches title, type, typeMeta', async () => {
    expect(await indexPatterns.getIds()).toEqual(['id']);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      type: 'index-pattern',
      fields: ['title', 'type', 'typeMeta', 'name'],
      perPage: 10000,
    });
  });

  test('caches saved objects', async () => {
    await indexPatterns.getIds();
    await indexPatterns.getTitles();
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  test('can refresh the saved objects caches', async () => {
    await indexPatterns.getIds();
    await indexPatterns.getTitles(true);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
  });

  test('deletes the index pattern', async () => {
    const id = '1';
    const indexPattern = await indexPatterns.get(id);

    expect(indexPattern).toBeDefined();
    await indexPatterns.delete(id);
    expect(indexPattern).not.toBe(await indexPatterns.get(id));
  });

  test('delete will throw if insufficient access', async () => {
    await expect(indexPatternsNoAccess.delete('1')).rejects.toMatchSnapshot();
  });

  test('should handle version conflicts', async () => {
    setDocsourcePayload(null, {
      id: 'foo',
      version: 'foo',
      attributes: {
        title: 'something',
      },
    });

    // Create a normal index patterns
    const pattern = await indexPatterns.get('foo');
    indexPatterns.clearCache();

    // Create the same one - we're going to handle concurrency
    const samePattern = await indexPatterns.get('foo');

    // This will conflict because samePattern did a save (from refreshFields)
    // but the resave should work fine
    pattern.title = 'foo2';
    await indexPatterns.updateSavedObject(pattern);

    // This should not be able to recover
    samePattern.title = 'foo3';

    let result;
    try {
      await indexPatterns.updateSavedObject(samePattern);
    } catch (err) {
      result = err;
    }

    expect(result.res.status).toBe(409);
  });

  test('create', async () => {
    const title = 'kibana-*';
    indexPatterns.refreshFields = jest.fn();

    const indexPattern = await indexPatterns.create({ title }, true);
    expect(indexPattern).toBeInstanceOf(DataView);
    expect(indexPattern.title).toBe(title);
    expect(indexPatterns.refreshFields).not.toBeCalled();

    await indexPatterns.create({ title });
    expect(indexPatterns.refreshFields).toBeCalled();
  });

  test('find', async () => {
    const search = 'kibana*';
    const size = 10;
    await indexPatterns.find('kibana*', size);

    expect(savedObjectsClient.find).lastCalledWith({
      type: 'index-pattern',
      fields: ['title'],
      search,
      searchFields: ['title'],
      perPage: size,
    });
  });

  test('createAndSave', async () => {
    const title = 'kibana-*';

    indexPatterns.createSavedObject = jest.fn(() =>
      Promise.resolve({
        id: 'id',
      } as unknown as DataView)
    );
    indexPatterns.setDefault = jest.fn();
    await indexPatterns.createAndSave({ title });
    expect(indexPatterns.createSavedObject).toBeCalled();
    expect(indexPatterns.setDefault).toBeCalled();
  });

  test('createAndSave will throw if insufficient access', async () => {
    const title = 'kibana-*';

    await expect(indexPatternsNoAccess.createAndSave({ title })).rejects.toMatchSnapshot();
  });

  test('updateSavedObject will throw if insufficient access', async () => {
    await expect(
      indexPatternsNoAccess.updateSavedObject({ id: 'id' } as unknown as DataView)
    ).rejects.toMatchSnapshot();
  });

  test('savedObjectToSpec', () => {
    const spec = indexPatterns.savedObjectToSpec(savedObject);
    expect(spec).toMatchSnapshot();
  });

  test('correctly composes runtime field', async () => {
    setDocsourcePayload('id', savedObject);
    const indexPattern = await indexPatterns.get('id');
    expect(indexPattern.fields).toMatchSnapshot();
  });

  test('failed requests are not cached', async () => {
    savedObjectsClient.get = jest
      .fn()
      .mockImplementation(async (type, id) => {
        return {
          id: object.id,
          version: object.version,
          attributes: object.attributes,
        };
      })
      .mockRejectedValueOnce({});

    const id = '1';

    // failed request!
    expect(indexPatterns.get(id)).rejects.toBeDefined();

    // successful subsequent request
    expect(async () => await indexPatterns.get(id)).toBeDefined();
  });

  describe('getDefaultDataView', () => {
    beforeEach(() => {
      indexPatterns.clearCache();
      jest.resetAllMocks();
    });

    test('gets default data view', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);

      expect(await indexPatterns.getDefaultDataView()).toBeInstanceOf(DataView);
      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
    });

    test('returns undefined if no data views exist', async () => {
      uiSettings.get = jest.fn().mockResolvedValue('foo');
      savedObjectsClient.find = jest.fn().mockResolvedValue([]);

      expect(await indexPatterns.getDefaultDataView()).toBeNull();
    });

    test("default doesn't exist, grabs another data view", async () => {
      uiSettings.get = jest.fn().mockResolvedValue('foo');
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);

      savedObjectsClient.get = jest.fn().mockResolvedValue({
        id: 'bar',
        version: 'foo',
        attributes: {
          title: 'something',
        },
      });

      expect(await indexPatterns.getDefaultDataView()).toBeInstanceOf(DataView);
      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
      expect(uiSettings.remove).toBeCalledTimes(1);
      expect(uiSettings.set).toBeCalledTimes(1);
    });

    test("when default exists, it isn't overridden with first data view", async () => {
      uiSettings.get = jest.fn().mockResolvedValue('id2');

      savedObjectsClient.find = jest.fn().mockResolvedValue([
        { id: 'id1', version: 'a', attributes: { title: 'title' } },
        { id: 'id2', version: 'a', attributes: { title: 'title' } },
      ]);

      savedObjectsClient.get = jest
        .fn()
        .mockImplementation((type: string, id: string) =>
          Promise.resolve({ id, version: 'a', attributes: { title: 'title' } })
        );

      const defaultDataViewResult = await indexPatterns.getDefaultDataView();
      expect(defaultDataViewResult).toBeInstanceOf(DataView);
      expect(defaultDataViewResult?.id).toBe('id2');

      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
      expect(uiSettings.remove).toBeCalledTimes(0);
      expect(uiSettings.set).toBeCalledTimes(0);
    });

    test('when setting default it prefers user created data views', async () => {
      savedObjectsClient.find = jest.fn().mockResolvedValue([
        {
          id: 'id1',
          version: 'a',
          attributes: { title: DEFAULT_ASSETS_TO_IGNORE.LOGS_INDEX_PATTERN },
        },
        {
          id: 'id2',
          version: 'a',
          attributes: { title: DEFAULT_ASSETS_TO_IGNORE.METRICS_INDEX_PATTERN },
        },
        {
          id: 'id3',
          version: 'a',
          attributes: { title: 'user-data-view' },
        },
      ]);

      savedObjectsClient.get = jest
        .fn()
        .mockImplementation((type: string, id: string) =>
          Promise.resolve({ id, version: 'a', attributes: { title: 'title' } })
        );

      const defaultDataViewResult = await indexPatterns.getDefaultDataView();
      expect(defaultDataViewResult).toBeInstanceOf(DataView);
      expect(defaultDataViewResult?.id).toBe('id3');

      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
      expect(uiSettings.remove).toBeCalledTimes(0);
      expect(uiSettings.set).toBeCalledTimes(1);
    });
  });
});
