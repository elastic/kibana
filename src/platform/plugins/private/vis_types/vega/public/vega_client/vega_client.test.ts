/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { getHttp } from '../services';
import { PUBLIC_API_VERSION, VEGA_API_PATH } from '../../common/constants';
import { vegaClient } from './vega_client';

jest.mock('../services', () => ({ getHttp: jest.fn() }));

describe('vegaClient', () => {
  const http = {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  const spec = { format: 'hjson' as const, value: '{ mark: point }' };

  beforeEach(() => {
    jest.mocked(getHttp).mockReturnValue(http as unknown as ReturnType<typeof getHttp>);
    jest.clearAllMocks();
  });

  it('creates, reads, updates, and deletes Vega items through the public API', async () => {
    http.post.mockResolvedValue({ id: 'vega-1' });
    http.get.mockResolvedValue({ data: { title: 'Vega item', spec } });
    http.put.mockResolvedValue({ id: 'vega-1' });
    http.delete.mockResolvedValue({ success: true });

    await vegaClient.create({ title: 'Vega item', spec });
    await vegaClient.get('vega-1');
    await vegaClient.update('vega-1', { title: 'Vega item', spec });
    await vegaClient.delete('vega-1');

    expect(http.post).toHaveBeenCalledWith(VEGA_API_PATH, {
      version: PUBLIC_API_VERSION,
      body: JSON.stringify({ title: 'Vega item', spec }),
    });
    expect(http.get).toHaveBeenCalledWith(`${VEGA_API_PATH}/vega-1`, {
      version: PUBLIC_API_VERSION,
    });
    expect(http.put).toHaveBeenCalledWith(`${VEGA_API_PATH}/vega-1`, {
      version: PUBLIC_API_VERSION,
      body: JSON.stringify({ title: 'Vega item', spec }),
    });
    expect(http.delete).toHaveBeenCalledWith(`${VEGA_API_PATH}/vega-1`, {
      version: PUBLIC_API_VERSION,
    });
  });

  it('adds a prefix wildcard when searching by title', async () => {
    http.get.mockResolvedValue({ data: [] });

    await vegaClient.search({ query: 'Sales', page: 2, per_page: 25 });

    expect(http.get).toHaveBeenCalledWith(VEGA_API_PATH, {
      version: PUBLIC_API_VERSION,
      query: { page: 2, per_page: 25, query: 'Sales*' },
    });
  });

  it('maps a missing library item to SavedObjectNotFound', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } });

    await expect(vegaClient.get('missing')).rejects.toBeInstanceOf(SavedObjectNotFound);
  });
});
