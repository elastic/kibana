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

import { createListStream } from './';

describe('listStream', () => {
  test('provides the values in the initial list', async () => {
    const str = createListStream([1, 2, 3, 4]);
    const onData = jest.fn();
    str.on('data', onData);

    await new Promise(resolve => str.on('end', resolve));

    expect(onData).toHaveBeenCalledTimes(4);
    expect(onData.mock.calls[0]).toEqual([1]);
    expect(onData.mock.calls[1]).toEqual([2]);
    expect(onData.mock.calls[2]).toEqual([3]);
    expect(onData.mock.calls[3]).toEqual([4]);
  });

  test('does not modify the list passed', async () => {
    const list = [1, 2, 3, 4];
    const str = createListStream(list);
    str.resume();
    await new Promise(resolve => str.on('end', resolve));
    expect(list).toEqual([1, 2, 3, 4]);
  });
});
