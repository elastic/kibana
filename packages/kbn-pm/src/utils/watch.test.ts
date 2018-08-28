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

import { EventEmitter } from 'events';
import { waitUntilWatchIsReady } from './watch';

describe('#waitUntilWatchIsReady', () => {
  let buildOutputStream: EventEmitter;
  let completionHintPromise: Promise<string>;
  beforeEach(() => {
    jest.useFakeTimers();

    buildOutputStream = new EventEmitter();
    completionHintPromise = waitUntilWatchIsReady(buildOutputStream, {
      handlerDelay: 100,
      handlerReadinessTimeout: 50,
    });
  });

  test('`waitUntilWatchIsReady` correctly handles `webpack` output', async () => {
    buildOutputStream.emit('data', Buffer.from('$ webpack'));
    buildOutputStream.emit('data', Buffer.from('Chunk Names'));

    jest.runAllTimers();

    expect(await completionHintPromise).toBe('webpack');
  });

  test('`waitUntilWatchIsReady` correctly handles `tsc` output', async () => {
    buildOutputStream.emit('data', Buffer.from('$ tsc'));
    buildOutputStream.emit('data', Buffer.from('Compilation complete.'));

    jest.runAllTimers();

    expect(await completionHintPromise).toBe('tsc');
  });

  test('`waitUntilWatchIsReady` fallbacks to default output handler if output is not recognizable', async () => {
    buildOutputStream.emit('data', Buffer.from('$ some-cli'));
    buildOutputStream.emit('data', Buffer.from('Compilation complete.'));
    buildOutputStream.emit('data', Buffer.from('Chunk Names.'));

    jest.runAllTimers();

    expect(await completionHintPromise).toBe('timeout');
  });

  test('`waitUntilWatchIsReady` fallbacks to default output handler if none output is detected', async () => {
    jest.runAllTimers();
    expect(await completionHintPromise).toBe('timeout');
  });

  test('`waitUntilWatchIsReady` fails if output stream receives error', async () => {
    buildOutputStream.emit('error', new Error('Uh, oh!'));

    jest.runAllTimers();

    await expect(completionHintPromise).rejects.toThrow(/Uh, oh!/);
  });
});
