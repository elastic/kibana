/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedObjectsCounts } from './get_saved_object_counts';

describe('getSavedObjectsCounts', () => {
  test('Get all the saved objects equal to 0 because no results were found', async () => {
    const callCluster = jest.fn(() => ({}));

    const results = await getSavedObjectsCounts(callCluster as any, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 0 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 0 },
      timelion_sheet: { total: 0 },
    });
  });

  test('Merge the zeros with the results', async () => {
    const callCluster = jest.fn(() => ({
      aggregations: {
        types: {
          buckets: [
            { key: 'dashboard', doc_count: 1 },
            { key: 'timelion-sheet', doc_count: 2 },
            { key: 'index-pattern', value: 2 }, // Malformed on purpose
            { key: 'graph_workspace', doc_count: 3 }, // already snake_cased
          ],
        },
      },
    }));

    const results = await getSavedObjectsCounts(callCluster as any, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 1 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 3 },
      timelion_sheet: { total: 2 },
    });
  });
});
