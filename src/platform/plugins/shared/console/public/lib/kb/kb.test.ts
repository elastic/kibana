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
import type { AutoCompleteContext, ResultTerm } from '../autocomplete/types';
import { isRecord } from '../../../common/utils/record_utils';

describe('Knowledge base', () => {
  let autocompleteInfo: AutocompleteInfo;
  beforeEach(() => {
    kb._test.setActiveApi(kb._test.loadApisFromJson({}));
    autocompleteInfo = new AutocompleteInfo();
    setAutocompleteInfo(autocompleteInfo);
    autocompleteInfo.mapping.clearMappings();
  });
  afterEach(() => {
    kb._test.setActiveApi(kb._test.loadApisFromJson({}));
    setAutocompleteInfo(autocompleteInfo);
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

  type TokenPath = Array<string | string[]>;
  type ExpectedContext = Partial<AutoCompleteContext> & {
    autoCompleteSet?: Array<string | ResultTerm>;
  };

  const normalizeTerm = (term: string | ResultTerm): ResultTerm =>
    _.isString(term) ? { name: term } : term;

  function testUrlContext(
    tokenPath: TokenPath,
    otherTokenValues: AutoCompleteContext['otherTokenValues'],
    expectedContext: ExpectedContext
  ) {
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, normalizeTerm);
    }

    const context: AutoCompleteContext = { otherTokenValues };
    populateContext(tokenPath, context, null, true, kb.getTopLevelUrlCompleteComponents('GET'));

    const actualContext: Record<string, unknown> = { ...context };

    // override endpoint to just check on id
    if (isRecord(actualContext.endpoint) && typeof actualContext.endpoint.id === 'string') {
      actualContext.endpoint = actualContext.endpoint.id;
    }

    delete actualContext.otherTokenValues;

    const norm = (t: string | ResultTerm) => normalizeTerm(t);

    if (Array.isArray(actualContext.autoCompleteSet)) {
      actualContext.autoCompleteSet = _.sortBy(_.map(actualContext.autoCompleteSet, norm), 'name');
    }
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.sortBy(
        _.map(expectedContext.autoCompleteSet, norm),
        'name'
      );
    }

    expect(actualContext).toEqual(expectedContext);
  }

  function i(term: string): ResultTerm {
    return { name: term, meta: 'index' };
  }

  function indexTest(
    name: string,
    tokenPath: TokenPath,
    otherTokenValues: AutoCompleteContext['otherTokenValues'],
    expectedContext: ExpectedContext
  ) {
    test(name, function () {
      const testApi = kb._test.loadApisFromJson(
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
        undefined
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
});
