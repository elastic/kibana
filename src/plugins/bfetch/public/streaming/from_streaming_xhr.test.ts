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

import { fromStreamingXhr } from './from_streaming_xhr';

const createXhr = (): XMLHttpRequest =>
  (({
    onprogress: () => {},
    onreadystatechange: () => {},
    readyState: 0,
    responseText: '',
    status: 0,
  } as unknown) as XMLHttpRequest);

test('returns observable', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);
  expect(typeof observable.subscribe).toBe('function');
});

test('emits an event to observable', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const spy = jest.fn();
  observable.subscribe(spy);

  expect(spy).toHaveBeenCalledTimes(0);

  (xhr as any).responseText = 'foo';
  xhr.onprogress!({} as any);

  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith('foo');
});

test('streams multiple events to observable', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const spy = jest.fn();
  observable.subscribe(spy);

  expect(spy).toHaveBeenCalledTimes(0);

  (xhr as any).responseText = '1';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '12';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '123';
  xhr.onprogress!({} as any);

  expect(spy).toHaveBeenCalledTimes(3);
  expect(spy.mock.calls[0][0]).toBe('1');
  expect(spy.mock.calls[1][0]).toBe('2');
  expect(spy.mock.calls[2][0]).toBe('3');
});

test('completes observable when request reaches end state', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const next = jest.fn();
  const complete = jest.fn();
  observable.subscribe({
    next,
    complete,
  });

  (xhr as any).responseText = '1';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '2';
  xhr.onprogress!({} as any);

  expect(complete).toHaveBeenCalledTimes(0);

  (xhr as any).readyState = 4;
  (xhr as any).status = 200;
  xhr.onreadystatechange!({} as any);

  expect(complete).toHaveBeenCalledTimes(1);
});

test('errors observable if request returns with error', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const next = jest.fn();
  const complete = jest.fn();
  const error = jest.fn();
  observable.subscribe({
    next,
    complete,
    error,
  });

  (xhr as any).responseText = '1';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '2';
  xhr.onprogress!({} as any);

  expect(complete).toHaveBeenCalledTimes(0);

  (xhr as any).readyState = 4;
  (xhr as any).status = 400;
  xhr.onreadystatechange!({} as any);

  expect(complete).toHaveBeenCalledTimes(0);
  expect(error).toHaveBeenCalledTimes(1);
  expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(error.mock.calls[0][0].message).toMatchInlineSnapshot(
    `"Batch request failed with status 400"`
  );
});

test('when .onprogress called multiple times with same text, does not create new observable events', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const spy = jest.fn();
  observable.subscribe(spy);

  expect(spy).toHaveBeenCalledTimes(0);

  (xhr as any).responseText = '1';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '1';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '12';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '12';
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '123';
  xhr.onprogress!({} as any);

  expect(spy).toHaveBeenCalledTimes(3);
  expect(spy.mock.calls[0][0]).toBe('1');
  expect(spy.mock.calls[1][0]).toBe('2');
  expect(spy.mock.calls[2][0]).toBe('3');
});

test('generates new observable events on .onreadystatechange', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const spy = jest.fn();
  observable.subscribe(spy);

  expect(spy).toHaveBeenCalledTimes(0);

  (xhr as any).responseText = '{"foo":"bar"}';
  xhr.onreadystatechange!({} as any);

  (xhr as any).responseText = '{"foo":"bar"}\n';
  xhr.onreadystatechange!({} as any);

  (xhr as any).responseText = '{"foo":"bar"}\n123';
  xhr.onreadystatechange!({} as any);

  expect(spy).toHaveBeenCalledTimes(3);
  expect(spy.mock.calls[0][0]).toBe('{"foo":"bar"}');
  expect(spy.mock.calls[1][0]).toBe('\n');
  expect(spy.mock.calls[2][0]).toBe('123');
});

test('.onreadystatechange and .onprogress can be called in any order', () => {
  const xhr = createXhr();
  const observable = fromStreamingXhr(xhr);

  const spy = jest.fn();
  observable.subscribe(spy);

  expect(spy).toHaveBeenCalledTimes(0);

  (xhr as any).responseText = '{"foo":"bar"}';
  xhr.onreadystatechange!({} as any);
  xhr.onprogress!({} as any);

  (xhr as any).responseText = '{"foo":"bar"}\n';
  xhr.onprogress!({} as any);
  xhr.onreadystatechange!({} as any);

  (xhr as any).responseText = '{"foo":"bar"}\n123';
  xhr.onreadystatechange!({} as any);
  xhr.onprogress!({} as any);
  xhr.onreadystatechange!({} as any);
  xhr.onprogress!({} as any);

  expect(spy).toHaveBeenCalledTimes(3);
  expect(spy.mock.calls[0][0]).toBe('{"foo":"bar"}');
  expect(spy.mock.calls[1][0]).toBe('\n');
  expect(spy.mock.calls[2][0]).toBe('123');
});
