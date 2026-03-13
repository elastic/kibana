/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { UrlParams } from './url_params';
import { populateContext } from './engine';
import type { AutoCompleteContext, ResultTerm } from './types';

describe('Url params', () => {
  type TokenPath = Array<string | string[]>;
  type ExpectedContext = Partial<AutoCompleteContext> & {
    autoCompleteSet?: Array<string | ResultTerm>;
  };

  function paramTest(
    name: string,
    description: ConstructorParameters<typeof UrlParams>[0],
    tokenPath: string | TokenPath,
    expectedContext: ExpectedContext,
    globalParams?: ConstructorParameters<typeof UrlParams>[1]
  ) {
    test(name, function () {
      const urlParams = new UrlParams(description, globalParams || {});
      if (typeof tokenPath === 'string') {
        tokenPath = _.map(tokenPath.split('/'), function (part) {
          const parts = part.split(',');
          if (parts.length === 1) {
            return parts[0];
          }
          return parts;
        });
      }

      if (expectedContext.autoCompleteSet) {
        expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (term) {
          if (_.isString(term)) {
            term = { name: term };
          }
          return term;
        });
        expectedContext.autoCompleteSet = _.sortBy(expectedContext.autoCompleteSet, 'name');
      }

      const context: AutoCompleteContext = {};

      const includeAutoComplete = expectedContext.autoCompleteSet !== undefined;
      populateContext(
        tokenPath,
        context,
        null,
        includeAutoComplete,
        urlParams.getTopLevelComponents()
      );

      if (context.autoCompleteSet) {
        context.autoCompleteSet = _.sortBy(context.autoCompleteSet, 'name');
      }

      expect(context).toEqual(expectedContext);
    });
  }

  function t(name: string, meta?: string, insertValue?: string): string | ResultTerm {
    let r: string | ResultTerm = name;
    if (meta) {
      r = { name, meta };
      if (meta === 'param' && !insertValue) {
        insertValue = name + '=';
      }
    }
    if (insertValue) {
      if (_.isString(r)) {
        r = { name };
      }
      r.insertValue = insertValue;
    }
    return r;
  }

  (function () {
    const params = {
      a: ['1', '2'],
      b: '__flag__',
    };
    paramTest('settings params', params, 'a/1', { a: ['1'] });

    paramTest('autocomplete top level', params, [], {
      autoCompleteSet: [t('a', 'param'), t('b', 'flag')],
    });

    paramTest(
      'autocomplete top level, with defaults',
      params,
      [],
      { autoCompleteSet: [t('a', 'param'), t('b', 'flag'), t('c', 'param')] },
      {
        c: ['2'],
      }
    );

    paramTest('autocomplete values', params, 'a', {
      autoCompleteSet: [t('1', 'a'), t('2', 'a')],
    });

    paramTest('autocomplete values flag', params, 'b', {
      autoCompleteSet: [t('true', 'b'), t('false', 'b')],
    });
  })();
});
