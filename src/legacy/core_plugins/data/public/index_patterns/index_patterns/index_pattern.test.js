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

import _ from 'lodash';
import mockLogstashFields from '../../../../../../fixtures/logstash_fields';
import { stubbedSavedObjectIndexPattern } from '../../../../../../fixtures/stubbed_saved_object_index_pattern';
import { IndexedArray } from 'ui/indexed_array';
import { DuplicateField } from 'ui/errors';

import { IndexPattern } from './index_pattern';

jest.mock('ui/registry/field_formats', () => ({
  fieldFormats: {
    getDefaultInstance: jest.fn(),
  }
}));

jest.mock('ui/utils/mapping_setup', () => ({
  expandShorthand: jest.fn().mockImplementation(() => ({
    id: true,
    title: true,
    fieldFormatMap: {
      _deserialize: jest.fn().mockImplementation(() => ([])),
    },
  }))
}));

jest.mock('ui/notify', () => ({
  toastNotifications: {
    addDanger: jest.fn(),
    addError: jest.fn(),
  }
}));

jest.mock('ui/saved_objects', () => {
  return {
    findObjectByTitle: jest.fn(),
  };
});

let mockFieldsFetcherResponse = [];
jest.mock('./_fields_fetcher', () => ({
  createFieldsFetcher: jest.fn().mockImplementation(() => ({
    fetch: jest.fn().mockImplementation(() => {
      return new Promise(resolve => resolve(mockFieldsFetcherResponse));
    }),
    every: jest.fn(),
  }))
}));

let object;
const savedObjectsClient = {
  create: jest.fn(),
  get: jest.fn().mockImplementation(() => object),
  update: jest.fn().mockImplementation(async (type, id, body, { version }) => {
    if (object._version !== version) {
      throw {
        res: {
          status: 409
        }
      };
    }

    object.attributes.title = body.title;
    object._version += 'a';

    return {
      id: object._id,
      _version: object._version,
    };
  }),
};

const patternCache = {
  clear: jest.fn(),
};

const config = {
  get: jest.fn(),
};

const apiClient = {
  getFieldsForTimePattern: jest.fn(),
  getFieldsForWildcard: jest.fn(),
};

// helper function to create index patterns
function create(id, payload) {
  const indexPattern = new IndexPattern(id, cfg => config.get(cfg), savedObjectsClient, apiClient, patternCache);

  setDocsourcePayload(id, payload);

  return indexPattern.init();
}

function setDocsourcePayload(id, providedPayload) {
  object = _.defaults(providedPayload || {}, stubbedSavedObjectIndexPattern(id));
}

describe('IndexPattern', () => {
  const indexPatternId = 'test-pattern';
  let indexPattern;
  // create an indexPattern instance for each test
  beforeEach(function () {
    return create(indexPatternId).then(function (pattern) {
      indexPattern = pattern;
    });
  });

  describe('api', function () {
    it('should have expected properties', function () {
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

  describe('init', function () {
    it('should append the found fields', function () {
      expect(savedObjectsClient.get).toHaveBeenCalled();
      expect(indexPattern.fields).toHaveLength(mockLogstashFields().length);
      expect(indexPattern.fields).toBeInstanceOf(IndexedArray);
    });
  });

  describe('fields', function () {
    it('should have expected properties on fields', function () {
      expect(indexPattern.fields[0]).toHaveProperty('displayName');
      expect(indexPattern.fields[0]).toHaveProperty('filterable');
      expect(indexPattern.fields[0]).toHaveProperty('format');
      expect(indexPattern.fields[0]).toHaveProperty('sortable');
      expect(indexPattern.fields[0]).toHaveProperty('scripted');
    });
  });

  describe('getScriptedFields', function () {
    it('should return all scripted fields', function () {
      const scriptedNames = _(mockLogstashFields()).where({ scripted: true }).pluck('name').value();
      const respNames = _.pluck(indexPattern.getScriptedFields(), 'name');
      expect(respNames).toEqual(scriptedNames);
    });
  });

  describe('getNonScriptedFields', function () {
    it('should return all non-scripted fields', function () {
      const notScriptedNames = _(mockLogstashFields()).where({ scripted: false }).pluck('name').value();
      const respNames = _.pluck(indexPattern.getNonScriptedFields(), 'name');
      expect(respNames).toEqual(notScriptedNames);
    });

  });

  describe('refresh fields', function () {
    it('should fetch fields from the fieldsFetcher', async function () {
      expect(indexPattern.fields.length).toBeGreaterThan(2);

      mockFieldsFetcherResponse = [
        { name: 'foo' },
        { name: 'bar' }
      ];

      await indexPattern.refreshFields();

      mockFieldsFetcherResponse = [];

      const newFields = indexPattern.getNonScriptedFields();
      expect(newFields).toHaveLength(2);
      expect(newFields.map(f => f.name)).toEqual(['foo', 'bar']);
    });

    it('should preserve the scripted fields', async function () {
      // add spy to indexPattern.getScriptedFields
      // sinon.spy(indexPattern, 'getScriptedFields');

      // refresh fields, which will fetch
      await indexPattern.refreshFields();

      // called to append scripted fields to the response from mapper.getFieldsForIndexPattern
      // sinon.assert.calledOnce(indexPattern.getScriptedFields);
      expect(indexPattern.getScriptedFields().map(f => f.name))
        .toEqual(mockLogstashFields().filter(f => f.scripted).map(f => f.name));
    });
  });

  describe('add and remove scripted fields', function () {
    it('should append the scripted field', function () {
      // keep a copy of the current scripted field count
      // const saveSpy = sinon.spy(indexPattern, 'save');
      const oldCount = indexPattern.getScriptedFields().length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean'
      };
      indexPattern.addScriptedField(scriptedField.name, scriptedField.script, scriptedField.type);
      const scriptedFields = indexPattern.getScriptedFields();
      // expect(saveSpy.callCount).to.equal(1);
      expect(scriptedFields).toHaveLength(oldCount + 1);
      expect(indexPattern.fields.byName[scriptedField.name].name).toEqual(scriptedField.name);
    });

    it('should remove scripted field, by name', function () {
      // const saveSpy = sinon.spy(indexPattern, 'save');
      const scriptedFields = indexPattern.getScriptedFields();
      const oldCount = scriptedFields.length;
      const scriptedField = _.last(scriptedFields);

      indexPattern.removeScriptedField(scriptedField.name);

      // expect(saveSpy.callCount).to.equal(1);
      expect(indexPattern.getScriptedFields().length).toEqual(oldCount - 1);
      expect(indexPattern.fields.byName[scriptedField.name]).toEqual(undefined);
    });

    it('should not allow duplicate names', async () => {
      const scriptedFields = indexPattern.getScriptedFields();
      const scriptedField = _.last(scriptedFields);
      expect.assertions(1);
      try {
        await indexPattern.addScriptedField(scriptedField.name, '\'new script\'', 'string');
      } catch (e) {
        expect(e).toBeInstanceOf(DuplicateField);
      }
    });
  });

  describe('popularizeField', function () {
    it('should increment the popularity count by default', function () {
      // const saveSpy = sinon.stub(indexPattern, 'save');
      indexPattern.fields.forEach(function (field) {
        const oldCount = field.count;

        indexPattern.popularizeField(field.name);

        // expect(saveSpy.callCount).to.equal(i + 1);
        expect(field.count).toEqual(oldCount + 1);
      });
    });

    it('should increment the popularity count', function () {
      // const saveSpy = sinon.stub(indexPattern, 'save');
      indexPattern.fields.forEach(function (field) {
        const oldCount = field.count;
        const incrementAmount = 4;

        indexPattern.popularizeField(field.name, incrementAmount);

        // expect(saveSpy.callCount).to.equal(i + 1);
        expect(field.count).toEqual(oldCount + incrementAmount);
      });
    });

    it('should decrement the popularity count', function () {
      indexPattern.fields.forEach(function (field) {
        const oldCount = field.count;
        const incrementAmount = 4;
        const decrementAmount = -2;

        indexPattern.popularizeField(field.name, incrementAmount);
        indexPattern.popularizeField(field.name, decrementAmount);

        expect(field.count).toEqual(oldCount + incrementAmount + decrementAmount);
      });
    });

    it('should not go below 0', function () {
      indexPattern.fields.forEach(function (field) {
        const decrementAmount = -Number.MAX_VALUE;
        indexPattern.popularizeField(field.name, decrementAmount);
        expect(field.count).toEqual(0);
      });
    });
  });

  describe('getIndex', () => {
    it('should return the title when there is no intervalName', () => {
      expect(indexPattern.getIndex()).toBe(indexPattern.title);
    });

    it('should convert time-based intervals to wildcards', () => {
      const oldTitle = indexPattern.title;
      indexPattern.intervalName = 'daily';

      indexPattern.title = '[logstash-]YYYY.MM.DD';
      expect(indexPattern.getIndex()).toBe('logstash-*');

      indexPattern.title = 'YYYY.MM.DD[-logstash]';
      expect(indexPattern.getIndex()).toBe('*-logstash');

      indexPattern.title = 'YYYY[-logstash-]YYYY.MM.DD';
      expect(indexPattern.getIndex()).toBe('*-logstash-*');

      indexPattern.title = 'YYYY[-logstash-]YYYY[-foo-]MM.DD';
      expect(indexPattern.getIndex()).toBe('*-logstash-*-foo-*');

      indexPattern.title = 'YYYY[-logstash-]YYYY[-foo-]MM.DD[-bar]';
      expect(indexPattern.getIndex()).toBe('*-logstash-*-foo-*-bar');

      indexPattern.title = '[logstash-]YYYY[-foo-]MM.DD[-bar]';
      expect(indexPattern.getIndex()).toBe('logstash-*-foo-*-bar');

      indexPattern.title = '[logstash]';
      expect(indexPattern.getIndex()).toBe('logstash');

      indexPattern.title = oldTitle;
      delete indexPattern.intervalName;
    });
  });

  it('should handle version conflicts', async () => {
    setDocsourcePayload(null, {
      _version: 'foo',
      _id: 'foo',
      attributes: {
        title: 'something'
      }
    });
    // Create a normal index pattern
    const pattern = new IndexPattern('foo', cfg => config.get(cfg), savedObjectsClient, apiClient, patternCache);
    await pattern.init();

    expect(pattern.version).toBe('fooa');

    // Create the same one - we're going to handle concurrency
    const samePattern = new IndexPattern('foo', cfg => config.get(cfg), savedObjectsClient, apiClient, patternCache);
    await samePattern.init();

    expect(samePattern.version).toBe('fooaa');

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
