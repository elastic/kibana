/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectApiBodyEntryRoundTrip } from '@kbn/saved-objects-management-plugin/server/mocks';
import { vegaApiBodyEntry } from './api_body_entry';

describe('vega API body entry', () => {
  it('round-trips a Vega item with a filter data view and a tag', () => {
    const stored = {
      attributes: {
        title: 'Vega chart',
        spec: { format: 'hjson' as const, value: '{ mark: point }' },
        query: { expression: 'message:error', language: 'kql' as const },
        filters: [
          {
            type: 'condition' as const,
            data_view_ref_name: 'filters[0].data_view_id',
            condition: { field: 'status', operator: 'is' as const, value: 'active' },
          },
        ],
      },
      references: [
        { name: 'filters[0].data_view_id', type: 'index-pattern', id: 'logs-data-view' },
        { name: 'tag-ref-web-tag', type: 'tag', id: 'web-tag' },
      ],
    };

    expect(expectApiBodyEntryRoundTrip(vegaApiBodyEntry, stored)).toEqual(
      expect.objectContaining({
        title: 'Vega chart',
        tags: ['web-tag'],
        filters: [expect.objectContaining({ data_view_id: 'logs-data-view' })],
      })
    );
  });

  it('throws for a filter whose data view reference is missing, as the public GET does', () => {
    expect(() =>
      vegaApiBodyEntry.toApi({
        attributes: {
          title: 'Vega chart',
          spec: { format: 'json', value: { mark: 'point' } },
          filters: [{ type: 'dsl', data_view_ref_name: 'missing', dsl: { match_all: {} } }],
        },
        references: [],
      })
    ).toThrow('Could not find reference');
  });
});
