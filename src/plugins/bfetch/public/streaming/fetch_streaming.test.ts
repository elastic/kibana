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

import { fetchStreaming } from './fetch_streaming';
import { mockXMLHttpRequest } from '../test_helpers/xhr';

const tick = () => new Promise(resolve => setTimeout(resolve, 1));

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

test('returns promise', () => {
  setup();
  const { promise } = fetchStreaming({
    url: 'http://example.com',
  });
  expect(typeof promise.then).toBe('function');
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
  const { promise } = fetchStreaming({
    url: 'http://example.com',
  });

  let resolved = false;
  promise.then(() => (resolved = true));

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

test('promise throws when request errors', async () => {
  const env = setup();
  const { promise } = fetchStreaming({
    url: 'http://example.com',
  });

  const spy = jest.fn();
  promise.catch(spy);

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
  const { promise, stream } = fetchStreaming({
    url: 'http://example.com',
  });

  const spy = jest.fn();
  promise.catch(() => {});
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
