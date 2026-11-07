/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createEsClient } from './es_client';
import { plugin } from '.';
import { EsClientPlugin } from './plugin';

jest.mock('./es_client', () => ({
  createEsClient: jest.fn(jest.requireActual('./es_client').createEsClient),
}));

const createEsClientMock = jest.mocked(createEsClient);

const setup = () => {
  const coreSetup = coreMock.createSetup();
  const contract = new EsClientPlugin().setup(coreSetup);
  return { contract, fetch: coreSetup.http.fetch };
};

describe('WHEN using the browser Elasticsearch client plugin', () => {
  it('SHOULD create the plugin from the public entry point', () => {
    expect(plugin()).toBeInstanceOf(EsClientPlugin);
  });

  it('SHOULD only expose getClient', () => {
    const { contract } = setup();

    expect(Object.keys(contract)).toEqual(['getClient']);
  });

  it('SHOULD expose a working client from the start contract', async () => {
    const coreStart = coreMock.createStart();
    coreStart.http.fetch.mockResolvedValue({ response: new Response(), body: { count: 1 } });
    const pluginInstance = new EsClientPlugin();
    const client = await pluginInstance.start(coreStart).getClient();

    expect(await client.count()).toEqual({ count: 1 });
    expect(() => pluginInstance.stop()).not.toThrow();
  });

  it('SHOULD send client requests to the proxy route as full responses', async () => {
    const { contract, fetch } = setup();
    fetch.mockResolvedValue({ response: new Response(), body: { count: 1 } });
    const client = await contract.getClient();

    await client.count({ index: 'my-index' });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_count',
      expect.objectContaining({ version: '1', asResponse: true, rawResponse: false })
    );
  });

  it('SHOULD return the same client from every getClient call', async () => {
    const { contract } = setup();

    const [first, second] = await Promise.all([contract.getClient(), contract.getClient()]);

    expect(first).toBe(second);
  });

  it('SHOULD load the client again WHEN an earlier load failed', async () => {
    const { contract } = setup();
    createEsClientMock.mockImplementationOnce(() => {
      throw new Error('Loading chunk failed');
    });

    await expect(contract.getClient()).rejects.toThrow('Loading chunk failed');
    const client = await contract.getClient();

    expect(client.search).toEqual(expect.any(Function));
  });
});
