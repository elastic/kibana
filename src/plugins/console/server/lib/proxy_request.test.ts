/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import http, { ClientRequest } from 'http';
import * as sinon from 'sinon';
import { proxyRequest } from './proxy_request';
import { URL } from 'url';
import { fail } from 'assert';

describe(`Console's send request`, () => {
  let sandbox: sinon.SinonSandbox;
  let stub: sinon.SinonStub<Parameters<typeof http.request>, ClientRequest>;
  let fakeRequest: http.ClientRequest;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stub = sandbox.stub(http, 'request').callsFake(() => {
      return fakeRequest;
    });
  });

  afterEach(() => {
    stub.restore();
    fakeRequest = null as any;
  });

  it('correctly implements timeout and abort mechanism', async () => {
    fakeRequest = {
      abort: sinon.stub(),
      on() {},
      once() {},
    } as any;
    try {
      await proxyRequest({
        agent: null as any,
        headers: {},
        method: 'get',
        payload: null as any,
        timeout: 0, // immediately timeout
        uri: new URL('http://noone.nowhere.none'),
      });
      fail('Should not reach here!');
    } catch (e) {
      expect(e.message).toEqual('Client request timeout');
      expect((fakeRequest.abort as sinon.SinonStub).calledOnce).toBe(true);
    }
  });

  it('correctly sets the "host" header entry', async () => {
    fakeRequest = {
      abort: sinon.stub(),
      on() {},
      once(event: string, fn: (v: string) => void) {
        if (event === 'response') {
          return fn('done');
        }
      },
    } as any;

    // Don't set a host header this time
    const result1 = await proxyRequest({
      agent: null as any,
      headers: {},
      method: 'get',
      payload: null as any,
      timeout: 30000,
      uri: new URL('http://noone.nowhere.none'),
    });

    expect(result1).toEqual('done');

    const [httpRequestOptions1] = stub.firstCall.args;

    expect((httpRequestOptions1 as any).headers).toEqual({
      'content-type': 'application/json',
      host: 'noone.nowhere.none', // Defaults to the provided host name
      'transfer-encoding': 'chunked',
    });

    // Set a host header
    const result2 = await proxyRequest({
      agent: null as any,
      headers: { Host: 'myhost' },
      method: 'get',
      payload: null as any,
      timeout: 30000,
      uri: new URL('http://noone.nowhere.none'),
    });

    expect(result2).toEqual('done');

    const [httpRequestOptions2] = stub.secondCall.args;
    expect((httpRequestOptions2 as any).headers).toEqual({
      'content-type': 'application/json',
      Host: 'myhost', // Uses provided host name
      'transfer-encoding': 'chunked',
    });
  });
});
