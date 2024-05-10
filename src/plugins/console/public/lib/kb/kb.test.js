/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { populateContext } from '../autocomplete/engine';

import '../../application/models/sense_editor/sense_editor.test.mocks';
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
    index: ['index1'],
    autoCompleteSet: ['_multi_indices', '_single_index'],
  });

  indexTest('Index integration 2', [['index1', 'index2']], [], {
    index: ['index1', 'index2'],
    autoCompleteSet: ['_multi_indices', '_single_index'],
  });
});
