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
    expectMocked(client.on);
    expectMocked(client.off);
    expectMocked(client.once);
  });

  it('`child` should be mocked and return a mocked Client', () => {
    expectMocked(client.child);

    const child = client.child();

    expect(child).not.toBe(client);
    expectMocked(child.search);
  });
});
