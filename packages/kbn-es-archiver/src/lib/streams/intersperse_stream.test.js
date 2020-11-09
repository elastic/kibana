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

import {
  createPromiseFromStreams,
  createListStream,
  createIntersperseStream,
  createConcatStream,
} from './';

describe('intersperseStream', () => {
  test('places the intersperse value between each provided value', async () => {
    expect(
      await createPromiseFromStreams([
        createListStream(['to', 'be', 'or', 'not', 'to', 'be']),
        createIntersperseStream(' '),
        createConcatStream(),
      ])
    ).toBe('to be or not to be');
  });

  test('emits values as soon as possible, does not needlessly buffer', async () => {
    const str = createIntersperseStream('y');
    const onData = jest.fn();
    str.on('data', onData);

    str.write('a');
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData.mock.calls[0]).toEqual(['a']);
    onData.mockClear();

    str.write('b');
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData.mock.calls[0]).toEqual(['y']);
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData.mock.calls[1]).toEqual(['b']);
  });
});
