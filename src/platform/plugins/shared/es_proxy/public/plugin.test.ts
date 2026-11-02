/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { EsProxyPlugin } from './plugin';

const setup = () => {
  const coreSetup = coreMock.createSetup();
  const contract = new EsProxyPlugin().setup(coreSetup);
  return { contract, fetch: coreSetup.http.fetch };
};

describe('WHEN using the browser Elasticsearch proxy client', () => {
  it('SHOULD send custom headers such as an ndjson content type', async () => {
    const { contract, fetch } = setup();
    const body = '{"index":{}}\n{"message":"hello"}\n';

    await contract.request({
      method: 'POST',
      path: 'my-index/_bulk',
      body,
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_proxy/my-index/_bulk',
      expect.objectContaining({
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-ndjson' },
        version: '1',
      })
    );
  });

  it('SHOULD serialize object bodies as JSON', async () => {
    const { contract, fetch } = setup();

    await contract.request({ method: 'POST', path: '/my-index/_search', body: { size: 0 } });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_proxy/my-index/_search',
      expect.objectContaining({ body: '{"size":0}' })
    );
  });

  it('SHOULD resolve stream requests with the unread response', async () => {
    const { contract, fetch } = setup();
    const response = new Response('data: {}\n\n');
    fetch.mockResolvedValue({ response });

    const result = await contract.stream({
      method: 'POST',
      path: '_inference/completion/x/_stream',
    });

    expect(result).toBe(response);
    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_proxy/_inference/completion/x/_stream',
      expect.objectContaining({ asResponse: true, rawResponse: true })
    );
  });

  it('SHOULD reject stream requests WHEN no response is received', async () => {
    const { contract, fetch } = setup();
    fetch.mockResolvedValue({});

    await expect(contract.stream({ method: 'GET', path: '' })).rejects.toThrow(
      'No response received'
    );
  });
});
