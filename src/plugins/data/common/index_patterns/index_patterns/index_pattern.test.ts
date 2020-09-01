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

import { defaults, map, last, get } from 'lodash';

import { IndexPattern } from './index_pattern';

import { DuplicateField } from '../../../../kibana_utils/common';
// @ts-ignore
import mockLogStashFields from '../../../../../fixtures/logstash_fields';
// @ts-ignore
import { stubbedSavedObjectIndexPattern } from '../../../../../fixtures/stubbed_saved_object_index_pattern';
import { IndexPatternField } from '../fields';

import { fieldFormatsMock } from '../../field_formats/mocks';

class MockFieldFormatter {}

fieldFormatsMock.getInstance = jest.fn().mockImplementation(() => new MockFieldFormatter()) as any;

jest.mock('../../field_mapping', () => {
  const originalModule = jest.requireActual('../../field_mapping');

  return {
    ...originalModule,
    expandShorthand: jest.fn(() => ({
      id: true,
      title: true,
      fieldFormatMap: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation(() => []),
      },
      fields: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation((fields) => fields),
      },
      sourceFilters: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation(() => undefined),
      },
      typeMeta: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation(() => undefined),
      },
    })),
  };
});

let mockFieldsFetcherResponse: any[] = [];

jest.mock('./_fields_fetcher', () => ({
  createFieldsFetcher: jest.fn().mockImplementation(() => ({
    fetch: jest.fn().mockImplementation(() => {
      return new Promise((resolve) => resolve(mockFieldsFetcherResponse));
    }),
    every: jest.fn(),
  })),
}));

let object: any = {};

const savedObjectsClient = {
  create: jest.fn(),
  get: jest.fn().mockImplementation(() => object),
  update: jest.fn().mockImplementation(async (type, id, body, { version }) => {
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
  }),
};

const patternCache = {
  clear: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  clearAll: jest.fn(),
};

const apiClient = {
  _getUrl: jest.fn(),
  getFieldsForTimePattern: jest.fn(),
  getFieldsForWildcard: jest.fn(),
};

// helper function to create index patterns
function create(id: string, payload?: any): Promise<IndexPattern> {
  const indexPattern = new IndexPattern(id, {
    savedObjectsClient: savedObjectsClient as any,
    apiClient,
    patternCache,
    fieldFormats: fieldFormatsMock,
    onNotification: () => {},
    onError: () => {},
    shortDotsEnable: false,
    metaFields: [],
  });

  setDocsourcePayload(id, payload);

  return indexPattern.init();
}

function setDocsourcePayload(id: string | null, providedPayload: any) {
  object = defaults(providedPayload || {}, stubbedSavedObjectIndexPattern(id));
}

describe('IndexPattern', () => {
  const indexPatternId = 'test-pattern';

  let indexPattern: IndexPattern;

  // create an indexPattern instance for each test
  beforeEach(() => {
    return create(indexPatternId).then((pattern: IndexPattern) => {
      indexPattern = pattern;
    });
  });

  describe('api', () => {
    test('should have expected properties', () => {
      expect(indexPattern).toHaveProperty('refreshFields');
      expect(indexPattern).toHaveProperty('popularizeField');
      expect(indexPattern).toHaveProperty('getScriptedFields');
      expect(indexPattern).toHaveProperty('getNonScriptedFields');
      expect(indexPattern).toHaveProperty('addScriptedField');
      expect(indexPattern).toHaveProperty('removeScriptedField');
      expect(indexPattern).toHaveProperty('toString');
      expect(indexPattern).toHaveProperty('toJSON');
      expect(indexPattern).toHaveProperty('save');

      // properties
      expect(indexPattern).toHaveProperty('fields');
    });
  });

  describe('init', () => {
    test('should append the found fields', () => {
      expect(savedObjectsClient.get).toHaveBeenCalled();
      expect(indexPattern.fields).toHaveLength(mockLogStashFields().length);
    });
  });

  describe('fields', () => {
    test('should have expected properties on fields', function () {
      expect(indexPattern.fields[0]).toHaveProperty('displayName');
      expect(indexPattern.fields[0]).toHaveProperty('filterable');
      expect(indexPattern.fields[0]).toHaveProperty('format');
      expect(indexPattern.fields[0]).toHaveProperty('sortable');
      expect(indexPattern.fields[0]).toHaveProperty('scripted');
    });
  });

  describe('getScriptedFields', () => {
    test('should return all scripted fields', () => {
      const scriptedNames = mockLogStashFields()
        .filter((item: IndexPatternField) => item.scripted === true)
        .map((item: IndexPatternField) => item.name);
      const respNames = map(indexPattern.getScriptedFields(), 'name');

      expect(respNames).toEqual(scriptedNames);
    });
  });

  describe('getComputedFields', () => {
    test('should be a function', () => {
      expect(indexPattern.getComputedFields).toBeInstanceOf(Function);
    });

    test('should request all stored fields', () => {
      expect(indexPattern.getComputedFields().storedFields).toContain('*');
    });

    test('should request date fields as docvalue_fields', () => {
      const { docvalueFields } = indexPattern.getComputedFields();
      const docValueFieldNames = docvalueFields.map((field) => field.field);

      expect(Object.keys(docValueFieldNames).length).toBe(3);
      expect(docValueFieldNames).toContain('@timestamp');
      expect(docValueFieldNames).toContain('time');
      expect(docValueFieldNames).toContain('utc_time');
    });

    test('should request date field doc values in date_time format', () => {
      const { docvalueFields } = indexPattern.getComputedFields();
      const timestampField = docvalueFields.find((field) => field.field === '@timestamp');

      expect(timestampField).toHaveProperty('format', 'date_time');
    });

    test('should not request scripted date fields as docvalue_fields', () => {
      const { docvalueFields } = indexPattern.getComputedFields();

      expect(docvalueFields).not.toContain('script date');
    });
  });

  describe('getNonScriptedFields', () => {
    test('should return all non-scripted fields', () => {
      const notScriptedNames = mockLogStashFields()
        .filter((item: IndexPatternField) => item.scripted === false)
        .map((item: IndexPatternField) => item.name);
      const respNames = map(indexPattern.getNonScriptedFields(), 'name');

      expect(respNames).toEqual(notScriptedNames);
    });
  });

  describe('refresh fields', () => {
    test('should fetch fields from the fieldsFetcher', async () => {
      expect(indexPattern.fields.length).toBeGreaterThan(2);

      mockFieldsFetcherResponse = [{ name: 'foo' }, { name: 'bar' }];

      await indexPattern.refreshFields();

      mockFieldsFetcherResponse = [];

      const newFields = indexPattern.getNonScriptedFields();

      expect(newFields).toHaveLength(2);
      expect([...newFields.map((f) => f.name)]).toEqual(['foo', 'bar']);
    });

    test('should preserve the scripted fields', async () => {
      // add spy to indexPattern.getScriptedFields
      // sinon.spy(indexPattern, 'getScriptedFields');

      // refresh fields, which will fetch
      await indexPattern.refreshFields();

      // called to append scripted fields to the response from mapper.getFieldsForIndexPattern
      // sinon.assert.calledOnce(indexPattern.getScriptedFields);
      expect(indexPattern.getScriptedFields().map((f) => f.name)).toEqual(
        mockLogStashFields()
          .filter((f: IndexPatternField) => f.scripted)
          .map((f: IndexPatternField) => f.name)
      );
    });
  });

  describe('add and remove scripted fields', () => {
    test('should append the scripted field', async () => {
      // keep a copy of the current scripted field count
      // const saveSpy = sinon.spy(indexPattern, 'save');
      const oldCount = indexPattern.getScriptedFields().length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean',
      };

      await indexPattern.addScriptedField(
        scriptedField.name,
        scriptedField.script,
        scriptedField.type,
        'lang'
      );

      const scriptedFields = indexPattern.getScriptedFields();
      // expect(saveSpy.callCount).to.equal(1);
      expect(scriptedFields).toHaveLength(oldCount + 1);
      expect((indexPattern.fields.getByName(scriptedField.name) as IndexPatternField).name).toEqual(
        scriptedField.name
      );
    });

    test('should remove scripted field, by name', async () => {
      // const saveSpy = sinon.spy(indexPattern, 'save');
      const scriptedFields = indexPattern.getScriptedFields();
      const oldCount = scriptedFields.length;
      const scriptedField = last(scriptedFields)!;

      await indexPattern.removeScriptedField(scriptedField.name);

      // expect(saveSpy.callCount).to.equal(1);
      expect(indexPattern.getScriptedFields().length).toEqual(oldCount - 1);
      expect(indexPattern.fields.getByName(scriptedField.name)).toEqual(undefined);
    });

    test('should not allow duplicate names', async () => {
      const scriptedFields = indexPattern.getScriptedFields();
      const scriptedField = last(scriptedFields) as any;
      expect.assertions(1);
      try {
        await indexPattern.addScriptedField(scriptedField.name, "'new script'", 'string', 'lang');
      } catch (e) {
        expect(e).toBeInstanceOf(DuplicateField);
      }
    });
  });

  describe('toSpec', () => {
    test('should match snapshot', () => {
      indexPattern.fieldFormatMap.bytes = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      };
      expect(indexPattern.toSpec()).toMatchSnapshot();
    });

    test('can restore from spec', async () => {
      indexPattern.fieldFormatMap.bytes = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      };
      const spec = indexPattern.toSpec();
      const restoredPattern = await create(spec.id as string);
      restoredPattern.initFromSpec(spec);
      expect(restoredPattern.id).toEqual(indexPattern.id);
      expect(restoredPattern.title).toEqual(indexPattern.title);
      expect(restoredPattern.timeFieldName).toEqual(indexPattern.timeFieldName);
      expect(restoredPattern.fields.length).toEqual(indexPattern.fields.length);
      expect(restoredPattern.fieldFormatMap.bytes instanceof MockFieldFormatter).toEqual(true);
    });
  });

  describe('popularizeField', () => {
    test('should increment the popularity count by default', () => {
      // const saveSpy = sinon.stub(indexPattern, 'save');
      indexPattern.fields.forEach(async (field) => {
        const oldCount = field.count || 0;

        await indexPattern.popularizeField(field.name);

        // expect(saveSpy.callCount).to.equal(i + 1);
        expect(field.count).toEqual(oldCount + 1);
      });
    });

    test('should increment the popularity count', () => {
      // const saveSpy = sinon.stub(indexPattern, 'save');
      indexPattern.fields.forEach(async (field) => {
        const oldCount = field.count || 0;
        const incrementAmount = 4;

        await indexPattern.popularizeField(field.name, incrementAmount);

        // expect(saveSpy.callCount).to.equal(i + 1);
        expect(field.count).toEqual(oldCount + incrementAmount);
      });
    });

    test('should decrement the popularity count', () => {
      indexPattern.fields.forEach(async (field) => {
        const oldCount = field.count || 0;
        const incrementAmount = 4;
        const decrementAmount = -2;

        await indexPattern.popularizeField(field.name, incrementAmount);
        await indexPattern.popularizeField(field.name, decrementAmount);

        expect(field.count).toEqual(oldCount + incrementAmount + decrementAmount);
      });
    });

    test('should not go below 0', () => {
      indexPattern.fields.forEach(async (field) => {
        const decrementAmount = -Number.MAX_VALUE;

        await indexPattern.popularizeField(field.name, decrementAmount);

        expect(field.count).toEqual(0);
      });
    });
  });

  test('should handle version conflicts', async () => {
    setDocsourcePayload(null, {
      id: 'foo',
      version: 'foo',
      attributes: {
        title: 'something',
      },
    });
    // Create a normal index pattern
    const pattern = new IndexPattern('foo', {
      savedObjectsClient: savedObjectsClient as any,
      apiClient,
      patternCache,
      fieldFormats: fieldFormatsMock,
      onNotification: () => {},
      onError: () => {},
      shortDotsEnable: false,
      metaFields: [],
    });
    await pattern.init();

    expect(get(pattern, 'version')).toBe('fooa');

    // Create the same one - we're going to handle concurrency
    const samePattern = new IndexPattern('foo', {
      savedObjectsClient: savedObjectsClient as any,
      apiClient,
      patternCache,
      fieldFormats: fieldFormatsMock,
      onNotification: () => {},
      onError: () => {},
      shortDotsEnable: false,
      metaFields: [],
    });
    await samePattern.init();

    expect(get(samePattern, 'version')).toBe('fooaa');

    // This will conflict because samePattern did a save (from refreshFields)
    // but the resave should work fine
    pattern.title = 'foo2';
    await pattern.save();

    // This should not be able to recover
    samePattern.title = 'foo3';

    let result;
    try {
      await samePattern.save();
    } catch (err) {
      result = err;
    }

    expect(result.res.status).toBe(409);
  });
});
