/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { defaults } from 'lodash';
import { IndexPatternsService, IndexPattern } from '.';
import { fieldFormatsMock } from '../../field_formats/mocks';
import { stubbedSavedObjectIndexPattern } from './fixtures/stubbed_saved_object_index_pattern';
import { UiSettingsCommon, SavedObjectsClientCommon, SavedObject } from '../types';

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

describe('IndexPatterns', () => {
  let indexPatterns: IndexPatternsService;
  let savedObjectsClient: SavedObjectsClientCommon;
  let SOClientGetDelay = 0;

  beforeEach(() => {
    const indexPatternObj = { id: 'id', version: 'a', attributes: { title: 'title' } };
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

    indexPatterns = new IndexPatternsService({
      uiSettings: ({
        get: () => Promise.resolve(false),
        getAll: () => {},
      } as any) as UiSettingsCommon,
      savedObjectsClient: (savedObjectsClient as unknown) as SavedObjectsClientCommon,
      apiClient: createFieldsFetcher(),
      fieldFormats,
      onNotification: () => {},
      onError: () => {},
      onRedirectNoIndexPattern: () => {},
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

  test('savedObjectCache pre-fetches only title', async () => {
    expect(await indexPatterns.getIds()).toEqual(['id']);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      type: 'index-pattern',
      fields: ['title'],
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
    expect(indexPattern).toBeInstanceOf(IndexPattern);
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
    indexPatterns.createSavedObject = jest.fn();
    indexPatterns.setDefault = jest.fn();
    await indexPatterns.createAndSave({ title });
    expect(indexPatterns.createSavedObject).toBeCalled();
    expect(indexPatterns.setDefault).toBeCalled();
  });

  test('savedObjectToSpec', () => {
    const savedObject = {
      id: 'id',
      version: 'version',
      attributes: {
        title: 'kibana-*',
        timeFieldName: '@timestamp',
        fields: '[]',
        sourceFilters: '[{"value":"item1"},{"value":"item2"}]',
        fieldFormatMap: '{"field":{}}',
        typeMeta: '{}',
        type: '',
      },
      type: 'index-pattern',
      references: [],
    };

    expect(indexPatterns.savedObjectToSpec(savedObject)).toMatchSnapshot();
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
});
