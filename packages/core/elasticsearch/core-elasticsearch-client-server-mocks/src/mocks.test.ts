/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchClientMock } from './mocks';

describe('Mocked client', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createInternalClient>;

  const expectMocked = (fn: jest.MockedFunction<any> | undefined) => {
    expect(fn).toBeDefined();
    expect(fn.mockReturnValue).toEqual(expect.any(Function));
  };

  beforeEach(() => {
    client = elasticsearchClientMock.createInternalClient();
  });

  it('`transport.request` should be mocked', () => {
    expectMocked(client.transport.request);
  });

  it('root level API methods should be mocked', () => {
    expectMocked(client.bulk);
    expectMocked(client.search);
  });

  it('nested level API methods should be mocked', () => {
    expectMocked(client.asyncSearch.get);
    expectMocked(client.nodes.info);
  });

  it('`close` should be mocked', () => {
    expectMocked(client.close);
  });

  it('used EventEmitter functions should be mocked', () => {
    expectMocked(client.diagnostic.on);
    expectMocked(client.diagnostic.off);
    expectMocked(client.diagnostic.once);
  });

  it('`child` should be mocked and return a mocked Client', () => {
    expectMocked(client.child);

    const child = client.child({});

    expect(child).not.toBe(client);
    expectMocked(child.search);
  });

  describe('mockResponse', () => {
    beforeEach(() => {
      client.ping.mockReset();
      client.ping.mockResponse(true, { statusCode: 217, headers: { foo: 'bar' } });
    });

    it('returns the body when `meta` is false', async () => {
      const response = await client.ping({}, { meta: false });
      expect(response).toBe(true);
    });
    it('returns the response when `meta` is true', async () => {
      const response = await client.ping({}, { meta: true });
      expect(response).toEqual({
        body: true,
        statusCode: 217,
        headers: { foo: 'bar' },
        warnings: [],
        meta: {},
      });
    });
    it('returns the body when `meta` is not provided', async () => {
      const response = await client.ping({}, {});
      expect(response).toBe(true);
    });
    it('mocks the response multiple times', async () => {
      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(true);
    });
  });
  describe('mockResponseOnce', () => {
    beforeEach(() => {
      client.ping.mockReset();
      client.ping.mockResponseOnce(true, { statusCode: 217, headers: { foo: 'bar' } });
    });

    it('returns the body when `meta` is false', async () => {
      const response = await client.ping({}, { meta: false });
      expect(response).toBe(true);
    });
    it('returns the response when `meta` is true', async () => {
      const response = await client.ping({}, { meta: true });
      expect(response).toEqual({
        body: true,
        statusCode: 217,
        headers: { foo: 'bar' },
        warnings: [],
        meta: {},
      });
    });
    it('returns the body when `meta` is not provided', async () => {
      const response = await client.ping({}, {});
      expect(response).toBe(true);
    });
    it('mocks the response only once', async () => {
      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(undefined);
    });
    it('can be chained', async () => {
      client.ping.mockReset();
      client.ping.mockResponseOnce(true);
      client.ping.mockResponseOnce(false);
      client.ping.mockResponseOnce(true);

      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(false);
      expect(await client.ping({}, {})).toBe(true);
    });
  });
  describe('mockResponseImplementation', () => {
    beforeEach(() => {
      client.ping.mockReset();
      client.ping.mockResponseImplementation(() => ({
        body: true,
        statusCode: 217,
        headers: { foo: 'bar' },
      }));
    });

    it('returns the body when `meta` is false', async () => {
      const response = await client.ping({}, { meta: false });
      expect(response).toBe(true);
    });
    it('returns the response when `meta` is true', async () => {
      const response = await client.ping({}, { meta: true });
      expect(response).toEqual({
        body: true,
        statusCode: 217,
        headers: { foo: 'bar' },
        warnings: [],
        meta: {},
      });
    });
    it('returns the body when `meta` is not provided', async () => {
      const response = await client.ping({}, {});
      expect(response).toBe(true);
    });
    it('mocks the response multiple times', async () => {
      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(true);
    });
  });
  describe('mockResponseImplementationOnce', () => {
    beforeEach(() => {
      client.ping.mockReset();
      client.ping.mockResponseImplementationOnce(() => ({
        body: true,
        statusCode: 217,
        headers: { foo: 'bar' },
      }));
    });

    it('returns the body when `meta` is false', async () => {
      const response = await client.ping({}, { meta: false });
      expect(response).toBe(true);
    });
    it('returns the response when `meta` is true', async () => {
      const response = await client.ping({}, { meta: true });
      expect(response).toEqual({
        body: true,
        statusCode: 217,
        headers: { foo: 'bar' },
        warnings: [],
        meta: {},
      });
    });
    it('returns the body when `meta` is not provided', async () => {
      const response = await client.ping({}, {});
      expect(response).toBe(true);
    });
    it('mocks the response only once', async () => {
      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(undefined);
    });
    it('can be chained', async () => {
      client.ping.mockReset();
      client.ping.mockResponseImplementationOnce(() => ({ body: true }));
      client.ping.mockResponseImplementationOnce(() => ({ body: false }));
      client.ping.mockResponseImplementationOnce(() => ({ body: true }));

      expect(await client.ping({}, {})).toBe(true);
      expect(await client.ping({}, {})).toBe(false);
      expect(await client.ping({}, {})).toBe(true);
    });
  });
});
