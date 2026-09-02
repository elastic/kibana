/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vegaClient } from './vega_client';
import { hasLibraryItemWithTitle } from './has_library_item_with_title';

jest.mock('./vega_client', () => ({ vegaClient: { search: jest.fn() } }));

describe('hasLibraryItemWithTitle', () => {
  it('detects an exact title conflict case-insensitively', async () => {
    jest.mocked(vegaClient.search).mockResolvedValue({
      data: [
        {
          id: 'vega-1',
          data: { title: 'Shared Vega' },
          meta: {},
        },
      ],
      meta: { page: 1, per_page: 20, total: 1 },
    });

    await expect(hasLibraryItemWithTitle('shared vega')).resolves.toBe(true);
    expect(vegaClient.search).toHaveBeenCalledWith({ query: '"shared vega"' });
  });

  it('ignores partial title matches', async () => {
    jest.mocked(vegaClient.search).mockResolvedValue({
      data: [
        {
          id: 'vega-1',
          data: { title: 'Shared Vega copy' },
          meta: {},
        },
      ],
      meta: { page: 1, per_page: 20, total: 1 },
    });

    await expect(hasLibraryItemWithTitle('Shared Vega')).resolves.toBe(false);
  });
});
