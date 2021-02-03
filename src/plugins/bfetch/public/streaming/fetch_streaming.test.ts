/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fetchStreaming } from './fetch_streaming';
import { mockXMLHttpRequest } from '../test_helpers/xhr';

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

const setup = () => {
  const { xhr, XMLHttpRequest } = mockXMLHttpRequest();
  window.XMLHttpRequest = XMLHttpRequest;
  return { xhr };
};

test('returns XHR request', () => {
  setup();
  const { xhr } = fetchStreaming({
    url: 'http://example.com',
  });
  expect(typeof xhr.readyState).toBe('number');
});

test('returns stream', () => {
  setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
  });
  expect(typeof stream.subscribe).toBe('function');
});

test('promise resolves when request completes', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
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

test('streams incoming text as it comes through', async () => {
  const env = setup();
  const { stream } = fetchStreaming({
    url: 'http://example.com',
  });

  const spy = jest.fn();
  stream.subscribe(spy);

  await tick();
  expect(spy).toHaveBeenCalledTimes(0);

  (env.xhr as any).responseText = 'foo';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith('foo');

  (env.xhr as any).responseText = 'foo\nbar';
  env.xhr.onprogress!({} as any);

  await tick();
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy).toHaveBeenCalledWith('\nbar');

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
  });

  expect(env.xhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
  expect(env.xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer 123');
});

test('uses credentials', async () => {
  const env = setup();

  expect(env.xhr.withCredentials).toBe(false);

  fetchStreaming({
    url: 'http://example.com',
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
  });
  expect(env.xhr.open).toHaveBeenCalledWith('POST', 'http://elastic.co');
});
