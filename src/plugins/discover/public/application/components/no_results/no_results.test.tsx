/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject } from '@elastic/eui/lib/test';

import { DiscoverNoResults, DiscoverNoResultsProps } from './no_results';

jest.mock('../../../kibana_services', () => {
  return {
    getServices: () => ({
      docLinks: {
        links: {
          query: {
            luceneQuerySyntax: 'documentation-link',
          },
        },
      },
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mountAndFindSubjects(props: DiscoverNoResultsProps) {
  const component = mountWithIntl(<DiscoverNoResults {...props} />);
  return {
    mainMsg: findTestSubject(component, 'discoverNoResults').length > 0,
    timeFieldMsg: findTestSubject(component, 'discoverNoResultsTimefilter').length > 0,
    luceneMsg: findTestSubject(component, 'discoverNoResultsLucene').length > 0,
    errorMsg: findTestSubject(component, 'discoverNoResultsError').length > 0,
  };
}

describe('DiscoverNoResults', () => {
  describe('props', () => {
    describe('no props', () => {
      test('renders default feedback', () => {
        const result = mountAndFindSubjects({});
        expect(result).toMatchInlineSnapshot(`
          Object {
            "errorMsg": false,
            "luceneMsg": false,
            "mainMsg": true,
            "timeFieldMsg": false,
          }
        `);
      });
    });
    describe('timeFieldName', () => {
      test('renders time range feedback', () => {
        const result = mountAndFindSubjects({
          timeFieldName: 'awesome_time_field',
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "errorMsg": false,
            "luceneMsg": false,
            "mainMsg": true,
            "timeFieldMsg": true,
          }
        `);
      });
    });

    describe('queryLanguage', () => {
      test('supports lucene and renders doc link', () => {
        const result = mountAndFindSubjects({ queryLanguage: 'lucene' });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "errorMsg": false,
            "luceneMsg": true,
            "mainMsg": true,
            "timeFieldMsg": false,
          }
        `);
      });
    });

    describe('error message', () => {
      test('renders error message', () => {
        const error = new Error('Fatal error');
        const result = mountAndFindSubjects({
          timeFieldName: 'awesome_time_field',
          error,
          queryLanguage: 'lucene',
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "errorMsg": true,
            "luceneMsg": false,
            "mainMsg": false,
            "timeFieldMsg": false,
          }
        `);
      });
    });
  });
});
