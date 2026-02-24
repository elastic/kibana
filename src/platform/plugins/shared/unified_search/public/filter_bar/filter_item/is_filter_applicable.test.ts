/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { getFilterKeys, isFilterApplicable } from './is_filter_applicable';

const mockGetIndexPatternFromFilter = jest.fn();

jest.mock('@kbn/data-plugin/public', () => ({
  getIndexPatternFromFilter: (...args: unknown[]) => mockGetIndexPatternFromFilter(...args),
}));

describe('is_filter_applicable', () => {
  const dataView: DataView = createStubDataView({
    spec: {
      id: 'test-data-view',
      title: 'test-*',
      fields: {
        fieldA: {
          name: 'fieldA',
          type: 'string',
          esTypes: ['keyword'],
          aggregatable: true,
          searchable: true,
        },
        fieldB: {
          name: 'fieldB',
          type: 'string',
          esTypes: ['keyword'],
          aggregatable: true,
          searchable: true,
        },
      },
    },
  });

  const buildPhraseFilter = (key: string): Filter =>
    ({
      meta: {
        type: 'phrase',
        key,
        params: { query: 'x' },
        negate: false,
        disabled: false,
      },
      query: {
        match_phrase: {
          [key]: 'x',
        },
      },
    } as unknown as Filter);

  const buildCombinedFilter = (params: Filter[]): Filter =>
    ({
      meta: {
        type: 'combined',
        relation: 'AND',
        params,
        negate: false,
        disabled: false,
      },
    } as unknown as Filter);

  it('treats filters as applicable when no dataViews are provided', () => {
    expect(isFilterApplicable(buildPhraseFilter('fieldA'), [])).toBe(true);
  });

  it('considers a phrase filter applicable if its key exists in the current data view', () => {
    expect(isFilterApplicable(buildPhraseFilter('fieldA'), [dataView])).toBe(true);
  });

  it('considers a phrase filter not applicable if its key does not exist', () => {
    expect(isFilterApplicable(buildPhraseFilter('missingField'), [dataView])).toBe(false);
  });

  it('considers a combined filter applicable if any child filter is applicable', () => {
    const combined = buildCombinedFilter([
      buildPhraseFilter('missingField'),
      buildPhraseFilter('fieldB'),
    ]);
    expect(isFilterApplicable(combined, [dataView])).toBe(true);
  });

  it('considers a combined filter not applicable if no child filters are applicable', () => {
    const combined = buildCombinedFilter([
      buildPhraseFilter('missingField1'),
      buildPhraseFilter('missingField2'),
    ]);
    expect(isFilterApplicable(combined, [dataView])).toBe(false);
  });

  it('extracts unique keys from combined filters', () => {
    const combined = buildCombinedFilter([
      buildPhraseFilter('fieldA'),
      buildPhraseFilter('fieldA'),
      buildPhraseFilter('fieldB'),
    ]);

    expect(getFilterKeys(combined).sort()).toEqual(['fieldA', 'fieldB']);
  });

  it('extracts keys from nested combined filters', () => {
    const combined = buildCombinedFilter([
      buildPhraseFilter('fieldA'),
      buildCombinedFilter([buildPhraseFilter('fieldB')]),
    ]);

    expect(getFilterKeys(combined).sort()).toEqual(['fieldA', 'fieldB']);
  });
});
