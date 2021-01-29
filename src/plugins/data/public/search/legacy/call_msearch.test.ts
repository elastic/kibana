/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpStart } from 'src/core/public';
import { coreMock } from '../../../../../core/public/mocks';
import { getCallMsearch } from './call_msearch';

describe('callMsearch', () => {
  const msearchMock = jest.fn().mockResolvedValue({ body: { responses: [] } });
  let http: jest.Mocked<HttpStart>;

  beforeEach(() => {
    msearchMock.mockClear();
    http = coreMock.createStart().http;
    http.post.mockResolvedValue(msearchMock);
  });

  test('calls http.post with the correct arguments', async () => {
    const searches = [{ header: { index: 'foo' }, body: {} }];
    const callMsearch = getCallMsearch({ http });
    await callMsearch({
      body: { searches },
      signal: new AbortController().signal,
    });

    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/internal/_msearch",
          Object {
            "body": "{\\"searches\\":[{\\"header\\":{\\"index\\":\\"foo\\"},\\"body\\":{}}]}",
            "signal": AbortSignal {},
          },
        ],
      ]
    `);
  });
});
