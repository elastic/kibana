/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setAutocompleteInfo, AutocompleteInfo } from '../../services';
import { expandAliases } from './expand_aliases';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { SettingsMock } from '../../services/settings.mock';
import { StorageMock } from '../../services/storage.mock';

function fc(f1, f2) {
  if (f1.name < f2.name) {
    return -1;
  }
  if (f1.name > f2.name) {
    return 1;
  }
  return 0;
}

function f(name, type) {
  return { name, type: type || 'string' };
}

describe('Autocomplete entities', () => {
  let mapping;
  let alias;
  let legacyTemplate;
  let indexTemplate;
  let componentTemplate;
  let dataStream;
  let autocompleteInfo;
  let settingsMock;
  let httpMock;

  beforeEach(() => {
    autocompleteInfo = new AutocompleteInfo();
    setAutocompleteInfo(autocompleteInfo);
    mapping = autocompleteInfo.mapping;

    httpMock = httpServiceMock.createSetupContract();
    const storage = new StorageMock({}, 'test');
    settingsMock = new SettingsMock(storage);

    mapping.setup(httpMock, settingsMock);

    alias = autocompleteInfo.alias;
    legacyTemplate = autocompleteInfo.legacyTemplate;
    indexTemplate = autocompleteInfo.indexTemplate;
    componentTemplate = autocompleteInfo.componentTemplate;
    dataStream = autocompleteInfo.dataStream;
  });
  afterEach(() => {
    autocompleteInfo.clear();
    autocompleteInfo = null;
  });

  describe('Mappings', function () {
    describe('When fields autocomplete is disabled', () => {
      beforeEach(() => {
        settingsMock.getAutocomplete.mockReturnValue({ fields: false });
      });

      test('does not return any suggestions', function () {
        mapping.loadMappings({
          index: {
            properties: {
              first_name: {
                type: 'string',
                index: 'analyzed',
                path: 'just_name',
                fields: {
                  any_name: { type: 'string', index: 'analyzed' },
                },
              },
            },
          },
        });

        expect(mapping.getMappings('index').sort(fc)).toEqual([]);
        expect(httpMock.get).not.toHaveBeenCalled();
      });
    });

    describe('When fields autocomplete is enabled', () => {
      beforeEach(() => {
        settingsMock.getAutocomplete.mockReturnValue({ fields: true });
        httpMock.get.mockReturnValue(
          Promise.resolve({
            mappings: { index: { mappings: { properties: { '@timestamp': { type: 'date' } } } } },
          })
        );
      });

      test('attempts to fetch mappings if not loaded', async () => {
        const autoCompleteContext = {};
        let loadingIndicator;

        mapping.isLoading$.subscribe((v) => {
          loadingIndicator = v;
        });

        // act
        mapping.getMappings('index', [], autoCompleteContext);

        expect(autoCompleteContext.asyncResultsState.isLoading).toBe(true);
        expect(loadingIndicator).toBe(true);

        expect(httpMock.get).toHaveBeenCalled();

        const fields = await autoCompleteContext.asyncResultsState.results;

        expect(loadingIndicator).toBe(false);
        expect(autoCompleteContext.asyncResultsState.isLoading).toBe(false);
        expect(fields).toEqual([{ name: '@timestamp', type: 'date' }]);
      });

      test('caches mappings for wildcard requests', async () => {
        httpMock.get.mockReturnValue(
          Promise.resolve({
            mappings: {
              'my-index-01': { mappings: { properties: { '@timestamp': { type: 'date' } } } },
              'my-index-02': { mappings: { properties: { name: { type: 'keyword' } } } },
            },
          })
        );

        const autoCompleteContext = {};

        mapping.getMappings('my-index*', [], autoCompleteContext);

        const fields = await autoCompleteContext.asyncResultsState.results;

        const expectedResult = [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'name',
            type: 'keyword',
          },
        ];

        expect(fields).toEqual(expectedResult);
        expect(mapping.getMappings('my-index*', [], autoCompleteContext)).toEqual(expectedResult);
      });

      test('returns mappings for data streams', () => {
        dataStream.loadDataStreams({
          data_streams: [
            { name: 'test_index1', indices: [{ index_name: '.ds-index-1' }] },
            {
              name: 'test_index3',
              indices: [{ index_name: '.ds-index-3' }, { index_name: '.ds-index-4' }],
            },
          ],
        });
        mapping.loadMappings({
          '.ds-index-3': {
            properties: {
              first_name: {
                type: 'string',
                index: 'analyzed',
                path: 'just_name',
                fields: {
                  any_name: { type: 'string', index: 'analyzed' },
                },
              },
              last_name: {
                type: 'string',
                index: 'no',
                fields: {
                  raw: { type: 'string', index: 'analyzed' },
                },
              },
            },
          },
        });

        const result = mapping.getMappings('test_index3', []);
        expect(result).toEqual([
          {
            name: 'first_name',
            type: 'string',
          },
          {
            name: 'any_name',
            type: 'string',
          },
          {
            name: 'last_name',
            type: 'string',
          },
          {
            name: 'last_name.raw',
            type: 'string',
          },
        ]);
      });

      test('Multi fields 1.0 style', function () {
        mapping.loadMappings({
          index: {
            properties: {
              first_name: {
                type: 'string',
                index: 'analyzed',
                path: 'just_name',
                fields: {
                  any_name: { type: 'string', index: 'analyzed' },
                },
              },
              last_name: {
                type: 'string',
                index: 'no',
                fields: {
                  raw: { type: 'string', index: 'analyzed' },
                },
              },
            },
          },
        });

        expect(mapping.getMappings('index').sort(fc)).toEqual([
          f('any_name', 'string'),
          f('first_name', 'string'),
          f('last_name', 'string'),
          f('last_name.raw', 'string'),
        ]);
      });

      test('Simple fields', function () {
        mapping.loadMappings({
          index: {
            properties: {
              str: {
                type: 'string',
              },
              number: {
                type: 'int',
              },
            },
          },
        });

        expect(mapping.getMappings('index').sort(fc)).toEqual([
          f('number', 'int'),
          f('str', 'string'),
        ]);
      });

      test('Simple fields - 1.0 style', function () {
        mapping.loadMappings({
          index: {
            mappings: {
              properties: {
                str: {
                  type: 'string',
                },
                number: {
                  type: 'int',
                },
              },
            },
          },
        });

        expect(mapping.getMappings('index').sort(fc)).toEqual([
          f('number', 'int'),
          f('str', 'string'),
        ]);
      });

      test('Nested fields', function () {
        mapping.loadMappings({
          index: {
            properties: {
              person: {
                type: 'object',
                properties: {
                  name: {
                    properties: {
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                    },
                  },
                  sid: { type: 'string', index: 'not_analyzed' },
                },
              },
              message: { type: 'string' },
            },
          },
        });

        expect(mapping.getMappings('index', []).sort(fc)).toEqual([
          f('message'),
          f('person.name.first_name'),
          f('person.name.last_name'),
          f('person.sid'),
        ]);
      });

      test('Enabled fields', function () {
        mapping.loadMappings({
          index: {
            properties: {
              person: {
                type: 'object',
                properties: {
                  name: {
                    type: 'object',
                    enabled: false,
                  },
                  sid: { type: 'string', index: 'not_analyzed' },
                },
              },
              message: { type: 'string' },
            },
          },
        });

        expect(mapping.getMappings('index', []).sort(fc)).toEqual([f('message'), f('person.sid')]);
      });

      test('Path tests', function () {
        mapping.loadMappings({
          index: {
            properties: {
              name1: {
                type: 'object',
                path: 'just_name',
                properties: {
                  first1: { type: 'string' },
                  last1: { type: 'string', index_name: 'i_last_1' },
                },
              },
              name2: {
                type: 'object',
                path: 'full',
                properties: {
                  first2: { type: 'string' },
                  last2: { type: 'string', index_name: 'i_last_2' },
                },
              },
            },
          },
        });

        expect(mapping.getMappings().sort(fc)).toEqual([
          f('first1'),
          f('i_last_1'),
          f('name2.first2'),
          f('name2.i_last_2'),
        ]);
      });

      test('Use index_name tests', function () {
        mapping.loadMappings({
          index: {
            properties: {
              last1: { type: 'string', index_name: 'i_last_1' },
            },
          },
        });

        expect(mapping.getMappings().sort(fc)).toEqual([f('i_last_1')]);
      });
    });
  });

  describe('Aliases', function () {
    test('Aliases', function () {
      alias.loadAliases(
        {
          test_index1: {
            aliases: {
              alias1: {},
            },
          },
          test_index2: {
            aliases: {
              alias2: {
                filter: {
                  term: {
                    FIELD: 'VALUE',
                  },
                },
              },
              alias1: {},
            },
          },
        },
        mapping
      );
      mapping.loadMappings({
        test_index1: {
          properties: {
            last1: { type: 'string', index_name: 'i_last_1' },
          },
        },
        test_index2: {
          properties: {
            last1: { type: 'string', index_name: 'i_last_1' },
          },
        },
      });

      expect(alias.getIndices(true, mapping).sort()).toEqual([
        '_all',
        'alias1',
        'alias2',
        'test_index1',
        'test_index2',
      ]);
      expect(alias.getIndices(false, mapping).sort()).toEqual(['test_index1', 'test_index2']);
      expect(expandAliases(['alias1', 'test_index2']).sort()).toEqual([
        'test_index1',
        'test_index2',
      ]);
      expect(expandAliases('alias2')).toEqual('test_index2');
    });
  });

  describe('Templates', function () {
    test('legacy templates, index templates, component templates', function () {
      legacyTemplate.loadTemplates({
        test_index1: { order: 0 },
        test_index2: { order: 0 },
        test_index3: { order: 0 },
      });

      indexTemplate.loadTemplates({
        index_templates: [
          { name: 'test_index1' },
          { name: 'test_index2' },
          { name: 'test_index3' },
        ],
      });

      componentTemplate.loadTemplates({
        component_templates: [
          { name: 'test_index1' },
          { name: 'test_index2' },
          { name: 'test_index3' },
        ],
      });

      const expectedResult = ['test_index1', 'test_index2', 'test_index3'];

      expect(legacyTemplate.getTemplates()).toEqual(expectedResult);
      expect(indexTemplate.getTemplates()).toEqual(expectedResult);
      expect(componentTemplate.getTemplates()).toEqual(expectedResult);
    });
  });

  describe('Data streams', function () {
    test('data streams', function () {
      dataStream.loadDataStreams({
        data_streams: [
          { name: 'test_index1', indices: [{ index_name: '.ds-index-1' }] },
          { name: 'test_index2', indices: [{ index_name: '.ds-index-2' }] },
          {
            name: 'test_index3',
            indices: [{ index_name: '.ds-index-3' }, { index_name: '.ds-index-4' }],
          },
        ],
      });

      const expectedResult = ['test_index1', 'test_index2', 'test_index3'];
      expect(dataStream.getDataStreams()).toEqual(expectedResult);
      expect(dataStream.perDataStreamIndices).toEqual({
        test_index1: ['.ds-index-1'],
        test_index2: ['.ds-index-2'],
        test_index3: ['.ds-index-3', '.ds-index-4'],
      });
    });

    test('extracts indices from a data stream', () => {
      dataStream.loadDataStreams({
        data_streams: [
          { name: 'test_index1', indices: [{ index_name: '.ds-index-1' }] },
          {
            name: 'test_index3',
            indices: [{ index_name: '.ds-index-3' }, { index_name: '.ds-index-4' }],
          },
        ],
      });

      expect(expandAliases('test_index1')).toEqual('.ds-index-1');
      expect(expandAliases('test_index3')).toEqual(['.ds-index-3', '.ds-index-4']);
    });
  });
});
