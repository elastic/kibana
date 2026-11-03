/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import API from '@elastic/elasticsearch/lib/api/index';
import { coreMock } from '@kbn/core/public/mocks';
import { EsClientPlugin } from '../plugin';

const setup = async () => {
  const coreSetup = coreMock.createSetup();
  const contract = new EsClientPlugin().setup(coreSetup);
  const client = await contract.getClient();
  return { client, contract, fetch: coreSetup.http.fetch };
};

const fetchError = (status: number, body?: object) =>
  Object.assign(new Error('Request failed'), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body,
  });

describe('WHEN using the elasticsearch-js client through the proxy', () => {
  it('SHOULD expose every elasticsearch-js API', async () => {
    const { client } = await setup();
    const apiNames = Object.keys(Object.getOwnPropertyDescriptors(API.prototype)).filter(
      (name) => name !== 'constructor'
    );

    expect(apiNames.length).toBeGreaterThan(0);
    expect(apiNames.filter((name) => !(name in client))).toEqual([]);
  });

  it('SHOULD reuse one client instance', async () => {
    const { client, contract } = await setup();

    expect(await contract.getClient()).toBe(client);
  });

  it('SHOULD send searches as POST requests with a JSON body', async () => {
    const { client, fetch } = await setup();
    fetch.mockResolvedValue({ hits: { hits: [] } });

    const response = await client.search({ index: 'my-index', query: { match_all: {} } });

    expect(response).toEqual({ hits: { hits: [] } });
    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_search',
      expect.objectContaining({
        method: 'POST',
        body: '{"query":{"match_all":{}}}',
        version: '1',
      })
    );
  });

  it('SHOULD keep reserved characters in path parameters encoded', async () => {
    const { client, fetch } = await setup();

    await client.get({ index: 'my-index', id: 'a/b c' });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_doc/a%2Fb%20c',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('SHOULD send list query parameters as comma-separated values', async () => {
    const { client, fetch } = await setup();

    await client.search({ index: 'my-index', _source_includes: ['a', 'b'] });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_search',
      expect.objectContaining({ query: { _source_includes: 'a,b' } })
    );
  });

  it('SHOULD call namespaced APIs', async () => {
    const { client, fetch } = await setup();

    await client.indices.getMapping({ index: 'my-index' });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_mapping',
      expect.objectContaining({ method: 'GET' })
    );
  });

  describe('WHEN calling an exists API', () => {
    it('SHOULD resolve true for an existing resource', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue('');

      expect(await client.indices.exists({ index: 'my-index' })).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/my-index',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('SHOULD resolve false WHEN Elasticsearch answers 404', async () => {
      const { client, fetch } = await setup();
      fetch.mockRejectedValue(fetchError(404));

      expect(await client.indices.exists({ index: 'missing' })).toBe(false);
    });
  });

  it('SHOULD reject with the fetch error WHEN Elasticsearch answers with an error', async () => {
    const { client, fetch } = await setup();
    const error = fetchError(403, { error: { type: 'security_exception' } });
    fetch.mockRejectedValue(error);

    await expect(client.search({ index: 'secret' })).rejects.toBe(error);
  });

  it('SHOULD resolve with the error body WHEN the status is ignored', async () => {
    const { client, fetch } = await setup();
    fetch.mockRejectedValue(fetchError(404, { found: false }));

    const response = await client.get({ index: 'my-index', id: '1' }, { ignore: [404] });

    expect(response).toEqual({ found: false });
  });

  it('SHOULD send bulk operations as ndjson', async () => {
    const { client, fetch } = await setup();

    await client.bulk({
      index: 'my-index',
      refresh: true,
      operations: [{ index: { _id: '1' } }, { message: 'hello' }],
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_bulk',
      expect.objectContaining({
        method: 'POST',
        query: { refresh: true },
        body: '{"index":{"_id":"1"}}\n{"message":"hello"}\n',
        headers: { 'Content-Type': 'application/x-ndjson' },
      })
    );
  });

  it('SHOULD send multi-search bodies as ndjson', async () => {
    const { client, fetch } = await setup();

    await client.msearch({ searches: [{ index: 'my-index' }, { query: { match_all: {} } }] });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/_msearch',
      expect.objectContaining({
        body: '{"index":"my-index"}\n{"query":{"match_all":{}}}\n',
        headers: { 'Content-Type': 'application/x-ndjson' },
      })
    );
  });

  it('SHOULD pass abort signals and normalize the content type header', async () => {
    const { client, fetch } = await setup();
    const { signal } = new AbortController();

    await client.search(
      { index: 'my-index' },
      { signal, headers: { 'content-type': 'application/vnd.elasticsearch+json' } }
    );

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_search',
      expect.objectContaining({
        signal,
        headers: { 'Content-Type': 'application/vnd.elasticsearch+json' },
      })
    );
  });

  it('SHOULD reject the meta option, which needs the full transport', async () => {
    const { client } = await setup();

    await expect(client.search({ index: 'my-index' }, { meta: true })).rejects.toThrow(
      'does not support the `meta` or `asStream` options'
    );
  });
});
