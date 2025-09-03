/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License"
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDistinctValuesTool } from './get_distinct_values';
import { client } from '../utils/elasticsearch';

jest.mock('../utils/elasticsearch', () => ({
  client: {
    search: jest.fn(),
  },
}));

describe('getDistinctValuesTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return distinct values for a given field', async () => {
    const mockAggs = {
      distinct_values: {
        buckets: [{ key: 'typescript' }, { key: 'javascript' }],
      },
    };
    (client.search as jest.Mock).mockResolvedValue({ aggregations: mockAggs });

    const result = await getDistinctValuesTool.handler({ field: 'language' });

    expect(client.search).toHaveBeenCalledWith({
      index: 'kibana-code-search',
      size: 0,
      query: undefined,
      aggs: {
        distinct_values: {
          terms: {
            field: 'language',
            size: 1000,
          },
        },
      },
    });

    expect(result.content[0].text).toEqual(JSON.stringify(['typescript', 'javascript']));
  });

  it('should include a KQL query when provided', async () => {
    const mockAggs = {
      distinct_values: {
        buckets: [{ key: 'call_expression' }],
      },
    };
    (client.search as jest.Mock).mockResolvedValue({ aggregations: mockAggs });

    await getDistinctValuesTool.handler({ field: 'kind', kql: 'language: "typescript"' });

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.any(Object),
        }),
      })
    );
  });

  it('should handle empty results', async () => {
    (client.search as jest.Mock).mockResolvedValue({
      aggregations: { distinct_values: { buckets: [] } },
    });

    const result = await getDistinctValuesTool.handler({ field: 'kind' });
    expect(result.content[0].text).toEqual('[]');
  });
});
