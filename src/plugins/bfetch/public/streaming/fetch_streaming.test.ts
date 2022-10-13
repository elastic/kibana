/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fetchStreaming } from './fetch_streaming';
import { mockXMLHttpRequest } from '../test_helpers/xhr';
import { promisify } from 'util';
import { deflate } from 'zlib';
const pDeflate = promisify(deflate);

const compressResponse = async (resp: any) => {
  const gzipped = await pDeflate(JSON.stringify(resp));
  return gzipped.toString('base64');
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

const setup = () => {
  const { xhr, XMLHttpRequest } = mockXMLHttpRequest();
  window.XMLHttpRequest = XMLHttpRequest;
  (xhr as any).status = 200;
  return { xhr };
};

test('returns XHR request', () => {
  setup();
  const { xhr } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });
  expect(typeof xhr.readyState).toBe('number');
});

test('returns stream', () => {
  setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });
  expect(typeof stream.subscribe).toBe('function');
});

test('promise resolves when request completes', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });

  let resolved = false;
  stream.toPromise().then(() => (resolved = true));

  await tick();
  expect(resolved).toBe(false);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(resolved).toBe(false);

  (env.xhr as any).responseText = 'foo\nbar';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(resolved).toBe(false);

  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 200;
  env.xhr.onreadystatechange!({} as any);

  await tick();
  expect(resolved).toBe(true);
});

test('promise resolves when compressed request completes', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => false,
  });

  let resolved = false;
  let result;
  stream.toPromise().then((r) => {
    resolved = true;
    result = r;
  });

  await tick();
  expect(resolved).toBe(false);

  const msg = { foo: 'bar' };

  // Whole message in a response
  (env.xhr as any).responseText = `${await compressResponse(msg)}\n`;
  env.xhr.onprogress!({} as any);

  await tick();
  expect(resolved).toBe(false);

  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 200;
  env.xhr.onreadystatechange!({} as any);

  await tick();
  expect(resolved).toBe(true);
  expect(result).toStrictEqual(JSON.stringify(msg));
});

test('promise resolves when compressed chunked request completes', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => false,
  });

  let resolved = false;
  let result;
  stream.toPromise().then((r) => {
    resolved = true;
    result = r;
  });

  await tick();
  expect(resolved).toBe(false);

  const msg = { veg: 'tomato' };
  const msgToCut = await compressResponse(msg);
  const part1 = msgToCut.substr(0, 3);

  // Message and a half in a response
  (env.xhr as any).responseText = part1;
  env.xhr.onprogress!({} as any);

  await tick();
  expect(resolved).toBe(false);

  // Half a message in a response
  (env.xhr as any).responseText = `${msgToCut}\n`;
  env.xhr.onprogress!({} as any);

  await tick();
  expect(resolved).toBe(false);

  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 200;
  env.xhr.onreadystatechange!({} as any);

  await tick();
  expect(resolved).toBe(true);
  expect(result).toStrictEqual(JSON.stringify(msg));
});

test('streams incoming text as it comes through, according to separators', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });

  const spy = jest.fn();
  stream.subscribe(spy);

  await tick();
  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo\nbar';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith('foo');

  (env.xhr as any).responseText = 'foo\nbar\n';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy).toHaveBeenCalledWith('bar');

  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 200;
  env.xhr.onreadystatechange!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(2);
});

test('completes stream observable when request finishes', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });

  const spy = jest.fn();
  stream.subscribe({
    complete: spy,
  });

  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);
  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 200;
  env.xhr.onreadystatechange!({} as any);

  expect(spy).toHaveBeenCalledTimes(1);
});

test('completes stream observable when aborted', async () => {
  const env = setup();
  const abort = new AbortController();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    signal: abort.signal,
    getIsCompressionDisabled: () => true,
  });

  const spy = jest.fn();
  stream.subscribe({
    complete: spy,
  });

  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);

  abort.abort();

  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 200;
  env.xhr.onreadystatechange!({} as any);

  expect(spy).toHaveBeenCalledTimes(1);
});

test('promise throws when request errors', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });

  const spy = jest.fn();
  stream.toPromise().catch(spy);

  await tick();
  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);
  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 400;
  env.xhr.onreadystatechange!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(spy.mock.calls[0][0].message).toMatchInlineSnapshot(
    `"Batch request failed with status 400"`
  );
});

test('stream observable errors when request errors', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });

  const spy = jest.fn();
  stream.subscribe({
    error: spy,
  });

  await tick();
  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);
  (env.xhr as any).readyState = 4;
  (env.xhr as any).status = 400;
  env.xhr.onreadystatechange!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(spy.mock.calls[0][0].message).toMatchInlineSnapshot(
    `"Batch request failed with status 400"`
  );
});

test('sets custom headers', async () => {
  const env = setup();
  fetchStreaming({
    url: 'http://example.com',
    headers: {
      'Content-Type': 'text/plain',
      Authorization: 'Bearer 123',
    },
    getIsCompressionDisabled: () => true,
  });

  expect(env.xhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
  expect(env.xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer 123');
});

test('uses credentials', async () => {
  const env = setup();

  expect(env.xhr.withCredentials).toBe(false);

  fetchStreaming({
    url: 'http://example.com',
    getIsCompressionDisabled: () => true,
  });

  expect(env.xhr.withCredentials).toBe(true);
});

test('opens XHR request and sends specified body', async () => {
  const env = setup();

  expect(env.xhr.open).toHaveBeenCalledTimes(0);
  expect(env.xhr.send).toHaveBeenCalledTimes(0);

  fetchStreaming({
    url: 'http://elastic.co',
    method: 'GET',
    body: 'foobar',
    getIsCompressionDisabled: () => true,
  });

  expect(env.xhr.open).toHaveBeenCalledTimes(1);
  expect(env.xhr.send).toHaveBeenCalledTimes(1);
  expect(env.xhr.open).toHaveBeenCalledWith('GET', 'http://elastic.co');
  expect(env.xhr.send).toHaveBeenCalledWith('foobar');
});

test('uses POST request method by default', async () => {
  const env = setup();
  fetchStreaming({
    url: 'http://elastic.co',
    getIsCompressionDisabled: () => true,
  });
  expect(env.xhr.open).toHaveBeenCalledWith('POST', 'http://elastic.co');
});
