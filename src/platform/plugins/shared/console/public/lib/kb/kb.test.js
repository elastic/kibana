/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { populateContext } from '../autocomplete/engine';

import * as kb from '.';
import { AutocompleteInfo, setAutocompleteInfo } from '../../services';

describe('Knowledge base', () => {
  let autocompleteInfo;
  beforeEach(() => {
    kb._test.setActiveApi(kb._test.loadApisFromJson({}));
    autocompleteInfo = new AutocompleteInfo();
    setAutocompleteInfo(autocompleteInfo);
    autocompleteInfo.mapping.clearMappings();
  });
  afterEach(() => {
    kb._test.setActiveApi(kb._test.loadApisFromJson({}));
    autocompleteInfo = null;
    setAutocompleteInfo(null);
  });

  const MAPPING = {
    index1: {
      properties: {
        'field1.1.1': { type: 'string' },
        'field1.1.2': { type: 'long' },
      },
    },
    index2: {
      properties: {
        'field2.1.1': { type: 'string' },
        'field2.1.2': { type: 'string' },
      },
    },
  };

  function testUrlContext(tokenPath, otherTokenValues, expectedContext) {
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
        if (_.isString(t)) {
          t = { name: t };
        }
        return t;
      });
    }

    const context = { otherTokenValues: otherTokenValues };
    populateContext(
      tokenPath,
      context,
      null,
      expectedContext.autoCompleteSet,
      kb.getTopLevelUrlCompleteComponents('GET')
    );

    // override context to just check on id
    if (context.endpoint) {
      context.endpoint = context.endpoint.id;
    }

    delete context.otherTokenValues;

    function norm(t) {
      if (_.isString(t)) {
        return { name: t };
      }
      return t;
    }

    if (context.autoCompleteSet) {
      context.autoCompleteSet = _.sortBy(_.map(context.autoCompleteSet, norm), 'name');
    }
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.sortBy(
        _.map(expectedContext.autoCompleteSet, norm),
        'name'
      );
    }

    expect(context).toEqual(expectedContext);
  }

  function i(term) {
    return { name: term, meta: 'index' };
  }

  function indexTest(name, tokenPath, otherTokenValues, expectedContext) {
    test(name, function () {
      // eslint-disable-next-line new-cap
      const testApi = new kb._test.loadApisFromJson(
        {
          indexTest: {
            endpoints: {
              _multi_indices: {
                patterns: ['{index}/_multi_indices'],
              },
              _single_index: { patterns: ['{index}/_single_index'] },
              _no_index: {
                // testing default patters
                //  patterns: ["_no_index"]
              },
            },
          },
        },
        kb._test.globalUrlComponentFactories
      );

      kb._test.setActiveApi(testApi);

      autocompleteInfo.mapping.loadMappings(MAPPING);
      testUrlContext(tokenPath, otherTokenValues, expectedContext);
    });
  }

  indexTest('Index integration 1', [], [], {
    autoCompleteSet: ['_no_index', i('index1'), i('index2')],
  });

  indexTest(
    'Index integration 2',
    [],
    ['index1'],
    // still return _no_index as index1 is not committed to yet.
    { autoCompleteSet: ['_no_index', i('index2')] }
  );

  indexTest('Index integration 2', ['index1'], [], {
    indices: ['index1'],
    autoCompleteSet: ['_multi_indices', '_single_index'],
  });

  indexTest('Index integration 2', [['index1', 'index2']], [], {
    indices: ['index1', 'index2'],
    autoCompleteSet: ['_multi_indices', '_single_index'],
  });

  describe('WHEN a mapping field name collides with a global rule', () => {
    it('SHOULD prefer mapping wildcard suggestions through endpoint scope links', () => {
      const api = kb._test.loadApisFromJson({
        es: {
          globals: {
            query: {
              bool: {},
              match: {},
            },
          },
          endpoints: {
            put_mapping: {
              data_autocomplete_rules: {
                properties: {
                  '*': {
                    analyzer: 'standard',
                    type: {
                      __one_of: ['keyword', 'text'],
                    },
                  },
                },
              },
            },
            'indices.put_mapping': {
              data_autocomplete_rules: {
                __scope_link: 'put_mapping',
              },
            },
          },
        },
      });
      kb._test.setActiveApi(api);
      const context = {
        otherTokenValues: [],
        endpointComponentResolver: kb.getEndpointBodyCompleteComponents,
        globalComponentResolver: kb.getGlobalAutocompleteComponents,
      };

      const components = kb.getEndpointBodyCompleteComponents('indices.put_mapping');
      if (!components) {
        throw new Error('Expected endpoint body completion components');
      }

      populateContext(['{', 'properties', '{', 'query', '{'], context, null, true, components);

      const suggestionNames = context.autoCompleteSet?.map(({ name }) => name);
      expect(suggestionNames).toEqual(expect.arrayContaining(['analyzer', 'type']));
      expect(suggestionNames).not.toContain('bool');
      expect(suggestionNames).not.toContain('match');
    });
  });
  describe('WHEN body rules contain primitive suggestions', () => {
    it('SHOULD preserve boolean, number, and string term types', () => {
      const api = kb._test.loadApisFromJson({
        es: {
          endpoints: {
            endpoint: {
              data_autocomplete_rules: {
                value: {
                  __one_of: [true, false, 0, 42, 'false', '42'],
                },
              },
            },
          },
        },
      });
      kb._test.setActiveApi(api);
      const context = {
        otherTokenValues: [],
        endpointComponentResolver: kb.getEndpointBodyCompleteComponents,
        globalComponentResolver: kb.getGlobalAutocompleteComponents,
      };

      populateContext(
        ['{', 'value'],
        context,
        null,
        true,
        kb.getEndpointBodyCompleteComponents('endpoint')
      );

      expect(
        context.autoCompleteSet
          ?.map(({ name }) => `${typeof name}:${String(name)}`)
          .sort((left, right) => left.localeCompare(right))
      ).toEqual([
        'boolean:false',
        'boolean:true',
        'number:0',
        'number:42',
        'string:42',
        'string:false',
      ]);
    });
  });
});
