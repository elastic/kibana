/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { defaults } from 'lodash';
import { DataViewsService, DataView, DataViewLazy } from '.';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

import {
  UiSettingsCommon,
  PersistenceAPI,
  SavedObject,
  DataViewSpec,
  IDataViewsApiClient,
} from '../types';
import { stubbedSavedObjectIndexPattern } from '../data_view.stub';
import { DataViewMissingIndices } from '../lib';

const createFieldsFetcher = () =>
  ({
    getFieldsForWildcard: jest.fn(async () => ({ fields: [], indices: ['test'] })),
  } as any as IDataViewsApiClient);

const fieldFormats = fieldFormatsMock;
let object: any = {};

function setDocsourcePayload(id: string | null, providedPayload: any) {
  object = defaults(providedPayload || {}, stubbedSavedObjectIndexPattern(id));
}

function doWithTimeout<T = unknown>(fn: () => T, timeout: number = 0): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), timeout));
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
  let savedObjectsClient: PersistenceAPI;
  let SOClientGetDelay = 0;
  let apiClient: IDataViewsApiClient;
  const uiSettings = {
    get: () => Promise.resolve(false),
    getAll: () => {},
    set: jest.fn(),
    remove: jest.fn(),
  } as any as UiSettingsCommon;
  const indexPatternObj = { id: 'id', version: 'a', attributes: { title: 'title' } };

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient = {} as PersistenceAPI;
    savedObjectsClient.find = jest.fn(
      () => Promise.resolve([indexPatternObj]) as Promise<Array<SavedObject<any>>>
    );
    savedObjectsClient.delete = jest.fn(() => Promise.resolve() as Promise<any>);
    savedObjectsClient.create = jest.fn();
    savedObjectsClient.get = jest.fn().mockImplementation(async (type, id) => {
      await new Promise((resolve) => setTimeout(resolve, SOClientGetDelay));
      return {
        id: object.id,
        version: object.version,
        attributes: object.attributes,
      };
    });
    savedObjectsClient.update = jest.fn().mockImplementation(async (id, body, { version }) => {
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

    apiClient = createFieldsFetcher();

    indexPatterns = new DataViewsService({
      uiSettings,
      savedObjectsClient: savedObjectsClient as unknown as PersistenceAPI,
      apiClient,
      fieldFormats,
      onNotification: () => {},
      onError: () => {},
      onRedirectNoIndexPattern: () => {},
      getCanSave: () => Promise.resolve(true),
      getCanSaveAdvancedSettings: () => Promise.resolve(true),
      scriptedFieldsEnabled: true,
    });

    indexPatternsNoAccess = new DataViewsService({
      uiSettings,
      savedObjectsClient: savedObjectsClient as unknown as PersistenceAPI,
      apiClient,
      fieldFormats,
      onNotification: () => {},
      onError: () => {},
      onRedirectNoIndexPattern: () => {},
      getCanSave: () => Promise.resolve(false),
      getCanSaveAdvancedSettings: () => Promise.resolve(false),
      scriptedFieldsEnabled: true,
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

  test('does cache gets for the same id for DataViewLazy', async () => {
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
    const dataViewLazyPromise = indexPatterns.getDataViewLazy(id);
    indexPatterns.getDataViewLazy(id);

    dataViewLazyPromise.then((dataViewLazy) => {
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(dataViewLazy).toBeDefined();
    });

    expect(await dataViewLazyPromise).toBe(await indexPatterns.getDataViewLazy(id));
    SOClientGetDelay = 0;
  });

  test('force field refresh', async () => {
    const id = '1';
    // make sure initial load and subsequent reloads use same params
    const args = {
      allowHidden: undefined,
      allowNoIndex: true,
      indexFilter: undefined,
      metaFields: false,
      pattern: 'something',
      rollupIndex: undefined,
      type: undefined,
      forceRefresh: false,
    };

    await indexPatterns.get(id);
    expect(apiClient.getFieldsForWildcard).toBeCalledTimes(1);
    expect(apiClient.getFieldsForWildcard).toBeCalledWith(args);
    await indexPatterns.get(id, undefined, true);
    expect(apiClient.getFieldsForWildcard).toBeCalledTimes(2);
    expect(apiClient.getFieldsForWildcard).toBeCalledWith(args);
  });

  test('getFieldsForWildcard called with allowNoIndex set to true as default', async () => {
    const id = '1';
    await indexPatterns.get(id);
    expect(apiClient.getFieldsForWildcard).toBeCalledWith({
      allowHidden: undefined,
      allowNoIndex: true,
      indexFilter: undefined,
      metaFields: false,
      pattern: 'something',
      rollupIndex: undefined,
      type: undefined,
      forceRefresh: false,
    });
  });

  test('getFieldsForIndexPattern called with allowHidden set to undefined as default', async () => {
    await indexPatterns.getFieldsForIndexPattern({ id: '1' } as DataViewSpec, {
      pattern: 'something',
    });
    expect(apiClient.getFieldsForWildcard).toBeCalledWith({
      allowHidden: undefined,
      allowNoIndex: true,
      metaFields: false,
      pattern: undefined,
      rollupIndex: undefined,
      type: undefined,
    });
  });

  test('getFieldsForIndexPattern called with allowHidden set to true', async () => {
    await indexPatterns.getFieldsForIndexPattern({ id: '1', allowHidden: true } as DataViewSpec, {
      pattern: 'something',
    });
    expect(apiClient.getFieldsForWildcard).toBeCalledWith({
      allowHidden: true,
      allowNoIndex: true,
      metaFields: false,
      pattern: undefined,
      rollupIndex: undefined,
      type: undefined,
    });
  });

  test('getFieldsForIndexPattern called with allowHidden set to false', async () => {
    await indexPatterns.getFieldsForIndexPattern({ id: '1', allowHidden: false } as DataViewSpec, {
      pattern: 'something',
    });
    expect(apiClient.getFieldsForWildcard).toBeCalledWith({
      allowHidden: false,
      allowNoIndex: true,
      metaFields: false,
      pattern: undefined,
      rollupIndex: undefined,
      type: undefined,
    });
  });

  test('getFieldsForIndexPattern called with getAllowHidden returning true', async () => {
    await indexPatterns.getFieldsForIndexPattern(
      { id: '1', getAllowHidden: () => true } as DataView,
      {
        pattern: 'something',
      }
    );
    expect(apiClient.getFieldsForWildcard).toBeCalledWith({
      allowHidden: true,
      allowNoIndex: true,
      metaFields: false,
      pattern: undefined,
      rollupIndex: undefined,
      type: undefined,
    });
  });

  test('getFieldsForIndexPattern called with getAllowHidden returning false', async () => {
    await indexPatterns.getFieldsForIndexPattern(
      { id: '1', getAllowHidden: () => false } as DataView,
      {
        pattern: 'something',
      }
    );
    expect(apiClient.getFieldsForWildcard).toBeCalledWith({
      allowHidden: false,
      allowNoIndex: true,
      metaFields: false,
      pattern: undefined,
      rollupIndex: undefined,
      type: undefined,
    });
  });

  test('does cache ad-hoc data views', async () => {
    const id = '1';

    // eslint-disable-next-line dot-notation
    const createFromSpecOriginal = indexPatterns['createFromSpec'];
    let mockedCreateFromSpec: jest.Mock;

    set(
      indexPatterns,
      'createFromSpec',
      (mockedCreateFromSpec = jest
        .fn()
        .mockImplementation((spec: DataViewSpec, skipFetchFields = false, displayErrors = true) =>
          doWithTimeout(
            () => createFromSpecOriginal.call(indexPatterns, spec, skipFetchFields, displayErrors),
            1000
          )
        ))
    );

    // run creating in parallel
    await Promise.all([
      indexPatterns.create({ id }),
      indexPatterns.create({ id }),
      indexPatterns.create({ id }),
      doWithTimeout(() => indexPatterns.create({ id }), 1),
      doWithTimeout(() => indexPatterns.create({ id }), 10),

      doWithTimeout(() => indexPatterns.get(id), 10),
      doWithTimeout(() => indexPatterns.get(id), 40),
    ]).then((results) =>
      results.forEach((value) => {
        expect(value.id).toBe(id);
      })
    );

    // tests after promise was resolved
    expect((await indexPatterns.get(id)).id).toBe(id);
    expect((await indexPatterns.create({ id })).id).toBe(id);

    expect(mockedCreateFromSpec).toHaveBeenCalledTimes(1);
    expect(mockedCreateFromSpec).toHaveBeenCalledWith({ id: '1' }, false, true);
  });

  test('does cache ad-hoc data views for DataViewLazy', async () => {
    const id = '1';

    // eslint-disable-next-line dot-notation
    const createFromSpecOriginal = indexPatterns['createFromSpecLazy'];
    let mockedCreateFromSpec: jest.Mock;

    set(
      indexPatterns,
      'createFromSpecLazy',
      (mockedCreateFromSpec = jest
        .fn()
        .mockImplementation((spec: DataViewSpec) =>
          doWithTimeout(() => createFromSpecOriginal.call(indexPatterns, spec), 1000)
        ))
    );

    // run creating in parallel
    await Promise.all([
      indexPatterns.createDataViewLazy({ id }),
      indexPatterns.createDataViewLazy({ id }),
      indexPatterns.createDataViewLazy({ id }),
      doWithTimeout(() => indexPatterns.createDataViewLazy({ id }), 1),
      doWithTimeout(() => indexPatterns.createDataViewLazy({ id }), 10),

      doWithTimeout(() => indexPatterns.getDataViewLazy(id), 10),
      doWithTimeout(() => indexPatterns.getDataViewLazy(id), 40),
    ]).then((results) =>
      results.forEach((value) => {
        expect(value.id).toBe(id);
      })
    );

    // tests after promise was resolved
    expect((await indexPatterns.getDataViewLazy(id)).id).toBe(id);
    expect((await indexPatterns.createDataViewLazy({ id })).id).toBe(id);

    expect(mockedCreateFromSpec).toHaveBeenCalledTimes(1);
    expect(mockedCreateFromSpec).toHaveBeenCalledWith({ id: '1' });
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

  test('existing indices, so dataView.matchedIndices.length equals 1 ', async () => {
    const id = '1';
    setDocsourcePayload(id, {
      id: 'foo',
      version: 'foo',
      attributes: {
        title: 'something',
      },
    });
    const dataView = await indexPatterns.get(id);
    expect(dataView.matchedIndices.length).toBe(1);
  });

  test('missing indices, so dataView.matchedIndices.length equals 0 ', async () => {
    const id = '1';
    setDocsourcePayload(id, {
      id: 'foo',
      version: 'foo',
      attributes: {
        title: 'something',
      },
    });
    apiClient.getFieldsForWildcard = jest.fn().mockImplementation(async () => {
      throw new DataViewMissingIndices('Catch me if you can!');
    });
    const dataView = await indexPatterns.get(id);
    expect(dataView.matchedIndices.length).toBe(0);
  });

  test('savedObjectCache pre-fetches title, type, typeMeta', async () => {
    expect(await indexPatterns.getIds()).toEqual(['id']);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
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
    expect(indexPattern).not.toBe(await indexPatterns.getDataViewLazy(id));
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
    indexPatterns.clearInstanceCache();

    // Create the same one - we're going to handle concurrency
    const samePattern = await indexPatterns.get('foo');

    // This will conflict because samePattern did a save (from refreshFields)
    // but the resave should work fine
    pattern.setIndexPattern('foo2');
    await indexPatterns.updateSavedObject(pattern);

    // This should not be able to recover
    samePattern.setIndexPattern('foo3');

    let result;
    try {
      await indexPatterns.updateSavedObject(samePattern);
    } catch (err) {
      result = err;
    }

    expect(result.res.status).toBe(409);
  });

  test('create', async () => {
    const indexPattern = 'kibana-*';
    indexPatterns.refreshFields = jest.fn();

    const dataView = await indexPatterns.create({ title: indexPattern }, true);
    expect(dataView).toBeInstanceOf(DataView);
    expect(dataView.getIndexPattern()).toBe(indexPattern);
    expect(indexPatterns.refreshFields).not.toBeCalled();

    await indexPatterns.create({ title: indexPattern });
    expect(indexPatterns.refreshFields).toBeCalled();
    expect(dataView.id).toBeDefined();
    expect(dataView.isPersisted()).toBe(false);

    const dataViewLazy = await indexPatterns.toDataViewLazy(dataView);
    expect(dataViewLazy instanceof DataViewLazy).toBe(true);
  });

  test('create DataViewLazy', async () => {
    const indexPattern = 'kibana-*';

    const dataViewLazy = await indexPatterns.createDataViewLazy({ title: indexPattern });
    expect(dataViewLazy).toBeInstanceOf(DataViewLazy);
    expect(dataViewLazy.getIndexPattern()).toBe(indexPattern);

    await indexPatterns.createDataViewLazy({ title: indexPattern });
    expect(dataViewLazy.id).toBeDefined();
    expect(dataViewLazy.isPersisted()).toBe(false);

    const dataView = await indexPatterns.toDataView(dataViewLazy);
    expect(dataView instanceof DataView).toBe(true);
  });

  test('createSavedObject', async () => {
    const title = 'kibana-*';
    const version = '8.4.0';
    const dataView = await indexPatterns.create({ title }, true);
    const id = dataView.id;

    savedObjectsClient.find = jest.fn().mockResolvedValue([]);
    savedObjectsClient.create = jest.fn().mockResolvedValue({
      ...savedObject,
      id: dataView.id,
      version,
      attributes: {
        ...savedObject.attributes,
        title: dataView.getIndexPattern(),
      },
    });

    await indexPatterns.createSavedObject(dataView);
    expect(dataView.id).toBe(id);
    expect(dataView.getIndexPattern()).toBe(title);
    expect(dataView.isPersisted()).toBe(true);
  });

  test('find', async () => {
    const search = 'kibana*';
    const size = 10;
    const result = await indexPatterns.find('kibana*', size);

    expect(result[0]).toBeInstanceOf(DataView);

    expect(savedObjectsClient.find).lastCalledWith({
      fields: ['title'],
      search,
      searchFields: ['title', 'name'],
      perPage: size,
    });
  });

  test('findLazy', async () => {
    const search = 'kibana*';
    const size = 10;
    const result = await indexPatterns.findLazy('kibana*', size);

    expect(result[0]).toBeInstanceOf(DataViewLazy);

    expect(savedObjectsClient.find).lastCalledWith({
      fields: ['title'],
      search,
      searchFields: ['title', 'name'],
      perPage: size,
    });
  });

  test('createAndSave', async () => {
    const title = 'kibana-*';
    indexPatterns.createSavedObject = jest.fn(() => Promise.resolve());
    savedObjectsClient.find = jest.fn().mockResolvedValue([]);
    savedObjectsClient.create = jest.fn().mockResolvedValue({});
    indexPatterns.setDefault = jest.fn();
    await indexPatterns.createAndSave({ title });
    expect(indexPatterns.createSavedObject).toBeCalled();
    expect(indexPatterns.setDefault).toBeCalled();
  });

  test('createAndSave DataViewLazy', async () => {
    const title = 'kibana-*';
    indexPatterns.createSavedObject = jest.fn(() => Promise.resolve());
    savedObjectsClient.find = jest.fn().mockResolvedValue([]);
    savedObjectsClient.create = jest.fn().mockResolvedValue({});
    indexPatterns.setDefault = jest.fn();
    await indexPatterns.createAndSaveDataViewLazy({ title });
    expect(indexPatterns.createSavedObject).toBeCalled();
    expect(indexPatterns.setDefault).toBeCalled();
  });

  test('createAndSave will throw if insufficient access', async () => {
    const title = 'kibana-*';

    await expect(indexPatternsNoAccess.createAndSave({ title })).rejects.toMatchSnapshot();
  });

  test('createAndSaveDataViewLazy will throw if insufficient access', async () => {
    const title = 'kibana-*';

    await expect(
      indexPatternsNoAccess.createAndSaveDataViewLazy({ title })
    ).rejects.toMatchSnapshot();
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

  test('failed requests are not cached for DataViewLazy', async () => {
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
    expect(indexPatterns.getDataViewLazy(id)).rejects.toBeDefined();

    // successful subsequent request
    expect(async () => await indexPatterns.getDataViewLazy(id)).toBeDefined();
  });

  test('can set and remove field format', async () => {
    const id = 'id';
    setDocsourcePayload(id, savedObject);
    const dataView = await indexPatterns.get(id);
    dataView.setFieldFormat('field', { id: 'formatId' });
    await indexPatterns.updateSavedObject(dataView);
    let lastCall = (savedObjectsClient.update as jest.Mock).mock.calls.pop() ?? [];
    let [, attrs] = lastCall;
    expect(attrs).toHaveProperty('fieldFormatMap');
    expect(attrs.fieldFormatMap).toMatchInlineSnapshot(`"{\\"field\\":{\\"id\\":\\"formatId\\"}}"`);
    dataView.deleteFieldFormat('field');
    await indexPatterns.updateSavedObject(dataView);
    lastCall = (savedObjectsClient.update as jest.Mock).mock.calls.pop() ?? [];
    [, attrs] = lastCall;

    // https://github.com/elastic/kibana/issues/134873: must keep an empty object and not delete it
    expect(attrs).toHaveProperty('fieldFormatMap');
    expect(attrs.fieldFormatMap).toMatchInlineSnapshot(`"{}"`);
  });

  describe('defaultDataViewExists', () => {
    beforeEach(() => {
      indexPatterns.clearCache();
      jest.clearAllMocks();
    });

    test('return true if exists', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);

      expect(await indexPatterns.defaultDataViewExists()).toBe(true);
      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(0);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
    });

    test('return false if no default data view found', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.find = jest.fn().mockResolvedValue([]);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);

      expect(await indexPatterns.defaultDataViewExists()).toBe(false);
      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(0);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
    });
  });

  describe('getDefaultDataView', () => {
    beforeEach(() => {
      indexPatterns.clearCache();
      jest.clearAllMocks();
    });

    test('gets default data view', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);
      jest.spyOn(indexPatterns, 'refreshFields');

      expect(await indexPatterns.getDefaultDataView()).toBeInstanceOf(DataView);
      expect(indexPatterns.refreshFields).not.toBeCalled();
      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
    });

    test('gets default data view lazy', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);

      expect(await indexPatterns.getDefaultDataViewLazy()).toBeInstanceOf(DataViewLazy);
      // make sure we're not pulling from cache
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);
    });

    test('gets default data view and passes down defined arguments (refreshFields and displayErrors)', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);
      jest.spyOn(indexPatterns, 'get');
      jest.spyOn(indexPatterns, 'refreshFields');

      const dataView = await indexPatterns.get(indexPatternObj.id); // and to cache the result

      const refreshFields = true;
      const displayErrors = false;
      expect(
        await indexPatterns.getDefaultDataView({ refreshFields, displayErrors })
      ).toBeInstanceOf(DataView);
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);

      expect(indexPatterns.get).toBeCalledWith(indexPatternObj.id, displayErrors, refreshFields);
      expect(indexPatterns.refreshFields).toBeCalledWith(dataView, displayErrors);
    });

    test('gets default data view and passes down undefined arguments (refreshFields and displayErrors)', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(indexPatternObj.id);
      savedObjectsClient.get = jest.fn().mockResolvedValue(indexPatternObj);
      savedObjectsClient.find = jest.fn().mockResolvedValue([indexPatternObj]);
      jest.spyOn(indexPatterns, 'get');
      jest.spyOn(indexPatterns, 'refreshFields');

      await indexPatterns.get(indexPatternObj.id); // to cache the result

      expect(await indexPatterns.getDefaultDataView()).toBeInstanceOf(DataView);
      expect(savedObjectsClient.get).toBeCalledTimes(1);
      expect(savedObjectsClient.find).toBeCalledTimes(1);

      expect(indexPatterns.get).toBeCalledWith(indexPatternObj.id, true, undefined);
      expect(indexPatterns.refreshFields).not.toBeCalled();
    });

    test('returns undefined if no data views exist', async () => {
      uiSettings.get = jest.fn().mockResolvedValue('foo');
      savedObjectsClient.find = jest.fn().mockResolvedValue([]);

      expect(await indexPatterns.getDefaultDataView()).toBeNull();
    });

    test('returns undefined if no data views exist - dataViewLazy', async () => {
      uiSettings.get = jest.fn().mockResolvedValue('foo');
      savedObjectsClient.find = jest.fn().mockResolvedValue([]);

      expect(await indexPatterns.getDefaultDataViewLazy()).toBeNull();
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
        .mockImplementation((id: string) =>
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

    test('dont set defaultIndex without capability allowing advancedSettings save', async () => {
      uiSettings.get = jest.fn().mockResolvedValue(null);
      savedObjectsClient.find = jest.fn().mockResolvedValue([
        {
          id: 'id1',
          version: 'a',
          attributes: { title: '1' },
        },
        {
          id: 'id2',
          version: 'a',
          attributes: { title: '2' },
        },
      ]);

      savedObjectsClient.get = jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve({ id, version: 'a', attributes: { title: '1' } })
        );

      const defaultDataViewResult = await indexPatternsNoAccess.getDefaultDataView();
      expect(defaultDataViewResult).toBeInstanceOf(DataView);
      expect(defaultDataViewResult?.id).toBe('id1');
      expect(uiSettings.set).toBeCalledTimes(0);
    });
  });

  describe('refreshFields', () => {
    beforeEach(() => {
      // preserve mocked functionality
      jest.clearAllMocks();
    });

    test('refreshFields includes runtimeFields', async () => {
      const indexPatternSpec: DataViewSpec = {
        runtimeFieldMap: {
          a: {
            type: 'keyword',
            script: {
              source: "emit('a');",
            },
          },
        },
        title: 'test',
      };

      const indexPattern = await indexPatterns.create(indexPatternSpec);
      await indexPatterns.refreshFields(indexPattern);
      expect(indexPattern.fields.length).toBe(1);
    });

    test('refreshFields defaults allowNoIndex to true', async () => {
      const indexPatternSpec: DataViewSpec = {
        title: 'test',
      };

      const indexPattern = await indexPatterns.create(indexPatternSpec);

      indexPatterns.refreshFields(indexPattern);
      // @ts-expect-error
      expect(apiClient.getFieldsForWildcard.mock.calls[0][0].allowNoIndex).toBe(true);
    });
  });
});
