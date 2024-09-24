/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLensAttributesFromSuggestion } from './get_lens_attributes';
import { AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { currentSuggestionMock } from '../__mocks__/suggestions_mock';

describe('getLensAttributesFromSuggestion', () => {
  const dataView = {
    id: `index-pattern-with-timefield-id`,
    title: `index-pattern-with-timefield-title`,
    fields: [],
    getFieldByName: jest.fn(),
    timeFieldName: '@timestamp',
    isPersisted: () => false,
    toSpec: () => ({}),
    toMinimalSpec: () => ({}),
  } as unknown as DataView;
  const query: AggregateQuery = { esql: 'from foo | limit 10' };

  it('should return correct attributes for given suggestion', () => {
    const lensAttrs = getLensAttributesFromSuggestion({
      filters: [],
      query,
      dataView,
      suggestion: currentSuggestionMock,
    });
    expect(lensAttrs).toEqual({
      state: expect.objectContaining({
        adHocDataViews: {
          'index-pattern-with-timefield-id': {},
        },
      }),
      references: [],
      title: currentSuggestionMock.title,
      visualizationType: 'lnsHeatmap',
    });
  });
});
