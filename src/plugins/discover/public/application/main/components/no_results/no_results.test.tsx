/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { DiscoverNoResults, DiscoverNoResultsProps } from './no_results';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';

beforeEach(() => {
  jest.clearAllMocks();
});

function mountAndFindSubjects(props: Omit<DiscoverNoResultsProps, 'onDisableFilters'>) {
  const services = {
    docLinks: {
      links: {
        query: {
          luceneQuerySyntax: 'documentation-link',
        },
      },
    },
  };
  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverNoResults onDisableFilters={() => {}} {...props} />
    </KibanaContextProvider>
  );
  return {
    mainMsg: findTestSubject(component, 'discoverNoResults').exists(),
    errorMsg: findTestSubject(component, 'discoverNoResultsError').exists(),
    adjustTimeRange: findTestSubject(component, 'discoverNoResultsTimefilter').exists(),
    adjustSearch: findTestSubject(component, 'discoverNoResultsAdjustSearch').exists(),
    adjustFilters: findTestSubject(component, 'discoverNoResultsAdjustFilters').exists(),
    checkIndices: findTestSubject(component, 'discoverNoResultsCheckIndices').exists(),
    disableFiltersButton: findTestSubject(component, 'discoverNoResultsDisableFilters').exists(),
  };
}

describe('DiscoverNoResults', () => {
  describe('props', () => {
    describe('no props', () => {
      test('renders default feedback', () => {
        const result = mountAndFindSubjects({});
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": false,
            "checkIndices": true,
            "disableFiltersButton": false,
            "errorMsg": false,
            "mainMsg": true,
          }
        `);
      });
    });
    describe('timeFieldName', () => {
      test('renders time range feedback', () => {
        const result = mountAndFindSubjects({
          isTimeBased: true,
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": true,
            "checkIndices": false,
            "disableFiltersButton": false,
            "errorMsg": false,
            "mainMsg": true,
          }
        `);
      });
    });

    describe('filter/query', () => {
      test('shows "adjust search" message when having query', () => {
        const result = mountAndFindSubjects({ hasQuery: true });
        expect(result).toHaveProperty('adjustSearch', true);
      });

      test('shows "adjust filters" message when having filters', () => {
        const result = mountAndFindSubjects({ hasFilters: true });
        expect(result).toHaveProperty('adjustFilters', true);
        expect(result).toHaveProperty('disableFiltersButton', true);
      });
    });

    describe('error message', () => {
      test('renders error message', () => {
        const error = new Error('Fatal error');
        const result = mountAndFindSubjects({
          isTimeBased: true,
          error,
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": false,
            "checkIndices": false,
            "disableFiltersButton": false,
            "errorMsg": true,
            "mainMsg": false,
          }
        `);
      });
    });
  });
});
