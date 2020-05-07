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

import { createReduceStream, createPromiseFromStreams, createListStream } from './';

const promiseFromEvent = (name, emitter) =>
  new Promise(resolve => emitter.on(name, () => resolve(name)));

describe('reduceStream', () => {
  test('calls the reducer for each item provided', async () => {
    const stub = jest.fn();
    await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createReduceStream((val, chunk, enc) => {
        stub(val, chunk, enc);
        return chunk;
      }, 0),
    ]);
    expect(stub).toHaveBeenCalledTimes(3);
    expect(stub.mock.calls[0]).toEqual([0, 1, 'utf8']);
    expect(stub.mock.calls[1]).toEqual([1, 2, 'utf8']);
    expect(stub.mock.calls[2]).toEqual([2, 3, 'utf8']);
  });

  test('provides the return value of the last iteration of the reducer', async () => {
    const result = await createPromiseFromStreams([
      createListStream('abcdefg'.split('')),
      createReduceStream(acc => acc + 1, 0),
    ]);
    expect(result).toBe(7);
  });

  test('emits an error if an iteration fails', async () => {
    const reduce = createReduceStream((acc, i) => expect(i).toBe(1), 0);
    const errorEvent = promiseFromEvent('error', reduce);

    reduce.write(1);
    reduce.write(2);
    reduce.resume();
    await errorEvent;
  });

  test('stops calling the reducer if an iteration fails, emits no data', async () => {
    const reducer = jest.fn((acc, i) => {
      if (i < 100) return acc + i;
      else throw new Error(i);
    });
    const reduce$ = createReduceStream(reducer, 0);

    const dataStub = jest.fn();
    const errorStub = jest.fn();
    reduce$.on('data', dataStub);
    reduce$.on('error', errorStub);
    const endEvent = promiseFromEvent('end', reduce$);

    reduce$.write(1);
    reduce$.write(2);
    reduce$.write(300);
    reduce$.write(400);
    reduce$.write(1000);
    reduce$.end();

    await endEvent;
    expect(reducer).toHaveBeenCalledTimes(3);
    expect(dataStub).toHaveBeenCalledTimes(0);
    expect(errorStub).toHaveBeenCalledTimes(1);
  });
});
