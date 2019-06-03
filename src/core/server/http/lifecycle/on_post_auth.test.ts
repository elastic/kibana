/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';
import { adoptToHapiOnPostAuthFormat } from './on_post_auth';
import { httpServerMock } from '../http_server.mocks';

describe('adoptToHapiOnPostAuthFormat', () => {
  it('Should allow passing request to the next handler', async () => {
    const continueSymbol = Symbol();
    const onPostAuth = adoptToHapiOnPostAuthFormat((req, t) => t.next());
    const result = await onPostAuth(
      httpServerMock.createRawRequest(),
      httpServerMock.createRawResponseToolkit({
        ['continue']: continueSymbol,
      })
    );

    expect(result).toBe(continueSymbol);
  });

  it('Should support redirecting to specified url', async () => {
    const redirectUrl = '/docs';
    const onPostAuth = adoptToHapiOnPostAuthFormat((req, t) => t.redirected(redirectUrl));
    const takeoverSymbol = {};
    const redirectMock = jest.fn(() => ({ takeover: () => takeoverSymbol }));
    const result = await onPostAuth(
      httpServerMock.createRawRequest(),
      httpServerMock.createRawResponseToolkit({
        redirect: redirectMock,
      })
    );

    expect(redirectMock).toBeCalledWith(redirectUrl);
    expect(result).toBe(takeoverSymbol);
  });

  it('Should support specifying statusCode and message for Boom error', async () => {
    const onPostAuth = adoptToHapiOnPostAuthFormat((req, t) => {
      return t.rejected(new Error('unexpected result'), { statusCode: 501 });
    });
    const result = (await onPostAuth(
      httpServerMock.createRawRequest(),
      httpServerMock.createRawResponseToolkit()
    )) as Boom;

    expect(result).toBeInstanceOf(Boom);
    expect(result.message).toBe('unexpected result');
    expect(result.output.statusCode).toBe(501);
  });

  it('Should return Boom.internal error if interceptor throws', async () => {
    const onPostAuth = adoptToHapiOnPostAuthFormat((req, t) => {
      throw new Error('unknown error');
    });
    const result = (await onPostAuth(
      httpServerMock.createRawRequest(),
      httpServerMock.createRawResponseToolkit()
    )) as Boom;

    expect(result).toBeInstanceOf(Boom);
    expect(result.message).toBe('unknown error');
    expect(result.output.statusCode).toBe(500);
  });

  it('Should return Boom.internal error if interceptor returns unexpected result', async () => {
    const onPostAuth = adoptToHapiOnPostAuthFormat((req, toolkit) => undefined as any);
    const result = (await onPostAuth(
      httpServerMock.createRawRequest(),
      httpServerMock.createRawResponseToolkit()
    )) as Boom;

    expect(result).toBeInstanceOf(Boom);
    expect(result.message).toMatchInlineSnapshot(
      `"Unexpected result from OnPostAuth. Expected OnPostAuthResult, but given: undefined."`
    );
    expect(result.output.statusCode).toBe(500);
  });
});
