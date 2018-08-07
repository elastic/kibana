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

import { collect } from '../../lib/collect';
import { $bindNodeCallback } from '../bind_node_callback';

type NodeCallback = (err: any, val?: string) => void;

test('callback with error', async () => {
  const error = new Error('fail');
  const read = (cb: NodeCallback) => cb(error);

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual([error]);
});

test('callback with value', async () => {
  const read = (cb: NodeCallback) => cb(undefined, 'test');

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual(['test', 'C']);
});

test('does not treat `null` as error', async () => {
  const read = (cb: NodeCallback) => cb(null, 'test');

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual(['test', 'C']);
});

test('multiple args', async () => {
  const read = (arg1: string, arg2: number, cb: NodeCallback) => cb(undefined, `${arg1}/${arg2}`);

  const read$ = $bindNodeCallback(read);
  const res = collect(read$('foo', 123));

  expect(await res).toEqual(['foo/123', 'C']);
});

test('function throws instead of calling callback', async () => {
  const error = new Error('fail');

  const read = (cb: NodeCallback) => {
    throw error;
  };

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual([error]);
});

test('errors if callback is called with more than two args', async () => {
  const read = (cb: (...args: any[]) => any) => cb(undefined, 'arg1', 'arg2');

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toMatchSnapshot();
});
