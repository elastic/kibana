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

import { ajaxStream, XMLHttpRequestLike } from './ajax_stream';

// eslint-disable-next-line no-empty
function noop() {}

describe('ajaxStream', () => {
  it('pulls items from the stream and calls the handler', async () => {
    const handler = jest.fn(() => ({}));
    const { req, sendText, done } = mockRequest();
    const messages = ['{ "hello": "world" }\n', '{ "tis": "fate" }\n'];

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
    });

    sendText(messages[0]);
    sendText(messages[1]);
    done();

    await promise;
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ hello: 'world' });
    expect(handler).toHaveBeenCalledWith({ tis: 'fate' });
  });

  it('handles newlines in values', async () => {
    const handler = jest.fn(() => ({}));
    const { req, sendText, done } = mockRequest();
    const messages = [
      JSON.stringify({ hello: 'wo\nrld' }),
      '\n',
      JSON.stringify({ tis: 'fa\nte' }),
      '\n',
    ];

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
    });

    messages.forEach(sendText);
    done();

    await promise;
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ hello: 'wo\nrld' });
    expect(handler).toHaveBeenCalledWith({ tis: 'fa\nte' });
  });

  it('handles partial messages', async () => {
    const handler = jest.fn(() => ({}));
    const { req, sendText, done } = mockRequest();
    const messages = ['{ "hello": "world" }\n', '{ "tis": "fate" }\n'].join('');

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
    });

    for (const s of messages) {
      sendText(s);
    }
    done();

    await promise;
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ hello: 'world' });
    expect(handler).toHaveBeenCalledWith({ tis: 'fate' });
  });

  it('sends the request', async () => {
    const handler = jest.fn(() => ({}));
    const { req, done } = mockRequest();

    const promise = ajaxStream('mehBasePath', { a: 'b' }, req, {
      url: '/test/endpoint',
      onResponse: handler,
      body: 'whatup',
      headers: { foo: 'bar' },
    });

    done();

    await promise;
    expect(req.open).toHaveBeenCalledWith('POST', 'mehBasePath/test/endpoint');
    expect(req.setRequestHeader).toHaveBeenCalledWith('foo', 'bar');
    expect(req.setRequestHeader).toHaveBeenCalledWith('a', 'b');
    expect(req.send).toHaveBeenCalledWith('whatup');
  });

  it('rejects if network failure', async () => {
    const handler = jest.fn(() => ({}));
    const { req, done } = mockRequest();

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
      body: 'whatup',
    });

    done(0);
    expect(await promise.then(() => true).catch(() => false)).toBeFalsy();
  });

  it('rejects if http status error', async () => {
    const handler = jest.fn(() => ({}));
    const { req, done } = mockRequest();

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
      body: 'whatup',
    });

    done(400);
    expect(await promise.then(() => true).catch(() => false)).toBeFalsy();
  });

  it('rejects if the payload contains invalid JSON', async () => {
    const handler = jest.fn(() => ({}));
    const { req, sendText, done } = mockRequest();
    const messages = ['{ waut? }\n'].join('');

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
    });

    sendText(messages);
    done();

    expect(await promise.then(() => true).catch(() => false)).toBeFalsy();
  });

  it('rejects if the handler throws', async () => {
    const handler = jest.fn(() => {
      throw new Error('DOH!');
    });
    const { req, sendText, done } = mockRequest();
    const messages = ['{ "hello": "world" }\n', '{ "tis": "fate" }\n'].join('');

    const promise = ajaxStream('', {}, req, {
      url: '/test/endpoint',
      onResponse: handler,
    });

    sendText(messages);
    done();

    expect(await promise.then(() => true).catch(({ message }) => message)).toMatch(/doh!/i);
  });
});

function mockRequest() {
  const req: XMLHttpRequestLike = {
    onprogress: noop,
    onreadystatechange: noop,
    open: jest.fn(),
    readyState: 0,
    responseText: '',
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    abort: jest.fn(),
    status: 0,
    withCredentials: false,
  };

  return {
    req,
    sendText(text: string) {
      req.responseText += text;
      req.onreadystatechange();
      req.onprogress();
    },
    done(status = 200) {
      req.status = status;
      req.readyState = 4;
      req.onreadystatechange();
    },
  };
}
