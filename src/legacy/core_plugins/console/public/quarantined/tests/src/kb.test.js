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
import { populateContext } from '../../src/autocomplete/engine';

import './setup_mocks';
import 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
const kb = require('../../src/kb');
const mappings = require('../../src/mappings');

describe('Knowledge base', () => {
  beforeEach(() => {
    mappings.clear();
    kb.setActiveApi(kb._test.loadApisFromJson({}));
  });
  afterEach(() => {
    mappings.clear();
    kb.setActiveApi(kb._test.loadApisFromJson({}));
  });

  const MAPPING = {
    index1: {
      'type1.1': {
        properties: {
          'field1.1.1': { type: 'string' },
          'field1.1.2': { type: 'long' },
        },
      },
      'type1.2': {
        properties: {},
      },
    },
    index2: {
      'type2.1': {
        properties: {
          'field2.1.1': { type: 'string' },
          'field2.1.2': { type: 'string' },
        },
      },
    },
  };

  function testUrlContext(tokenPath, otherTokenValues, expectedContext) {
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function(t) {
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

  function t(term) {
    return { name: term, meta: 'type' };
  }

  function i(term) {
    return { name: term, meta: 'index' };
  }

  function indexTest(name, tokenPath, otherTokenValues, expectedContext) {
    test(name, function() {
      // eslint-disable-next-line new-cap
      const testApi = new kb._test.loadApisFromJson(
        {
          indexTest: {
            endpoints: {
              _multi_indices: {
                patterns: ['{indices}/_multi_indices'],
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

      kb.setActiveApi(testApi);

      mappings.loadMappings(MAPPING);
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
    autoCompleteSet: ['_multi_indices'],
  });

  function typeTest(name, tokenPath, otherTokenValues, expectedContext) {
    test(name, function() {
      const testApi = kb._test.loadApisFromJson(
        {
          typeTest: {
            endpoints: {
              _multi_types: { patterns: ['{indices}/{types}/_multi_types'] },
              _single_type: { patterns: ['{indices}/{type}/_single_type'] },
              _no_types: { patterns: ['{indices}/_no_types'] },
            },
          },
        },
        kb._test.globalUrlComponentFactories
      );
      kb.setActiveApi(testApi);

      mappings.loadMappings(MAPPING);

      testUrlContext(tokenPath, otherTokenValues, expectedContext);
    });
  }

  typeTest('Type integration 1', ['index1'], [], {
    indices: ['index1'],
    autoCompleteSet: ['_no_types', t('type1.1'), t('type1.2')],
  });
  typeTest(
    'Type integration 2',
    ['index1'],
    ['type1.2'],
    // we are not yet comitted to type1.2, so _no_types is returned
    { indices: ['index1'], autoCompleteSet: ['_no_types', t('type1.1')] }
  );

  typeTest('Type integration 3', ['index2'], [], {
    indices: ['index2'],
    autoCompleteSet: ['_no_types', t('type2.1')],
  });

  typeTest('Type integration 4', ['index1', 'type1.2'], [], {
    indices: ['index1'],
    types: ['type1.2'],
    autoCompleteSet: ['_multi_types', '_single_type'],
  });

  typeTest('Type integration 5', [['index1', 'index2'], ['type1.2', 'type1.1']], [], {
    indices: ['index1', 'index2'],
    types: ['type1.2', 'type1.1'],
    autoCompleteSet: ['_multi_types'],
  });
});
