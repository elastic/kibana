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

import { batchedFetch, Request } from './batched_fetch';

const serialize = (o: any) => JSON.stringify(o);

const ajaxStream = jest.fn(async ({ body, onResponse }) => {
  const { functions } = JSON.parse(body);
  functions.map(({ id, functionName, context, args }: Request) =>
    onResponse({
      id,
      statusCode: context,
      result: Number(context) >= 400 ? { err: {} } : `${functionName}${context}${args}`,
    })
  );
});

describe('batchedFetch', () => {
  it('resolves the correct promise', async () => {
    const ajax = batchedFetch({ ajaxStream, serialize, ms: 1 });

    const result = await Promise.all([
      ajax({ functionName: 'a', context: 1, args: 'aaa' }),
      ajax({ functionName: 'b', context: 2, args: 'bbb' }),
    ]);

    expect(result).toEqual(['a1aaa', 'b2bbb']);
  });

  it('dedupes duplicate calls', async () => {
    const ajax = batchedFetch({ ajaxStream, serialize, ms: 1 });

    const result = await Promise.all([
      ajax({ functionName: 'a', context: 1, args: 'aaa' }),
      ajax({ functionName: 'b', context: 2, args: 'bbb' }),
      ajax({ functionName: 'a', context: 1, args: 'aaa' }),
      ajax({ functionName: 'a', context: 1, args: 'aaa' }),
    ]);

    expect(result).toEqual(['a1aaa', 'b2bbb', 'a1aaa', 'a1aaa']);
    expect(ajaxStream).toHaveBeenCalledTimes(2);
  });

  it('rejects responses whose statusCode is >= 300', async () => {
    const ajax = batchedFetch({ ajaxStream, serialize, ms: 1 });

    const result = await Promise.all([
      ajax({ functionName: 'a', context: 500, args: 'aaa' }).catch(() => 'fail'),
      ajax({ functionName: 'b', context: 400, args: 'bbb' }).catch(() => 'fail'),
      ajax({ functionName: 'c', context: 200, args: 'ccc' }),
    ]);

    expect(result).toEqual(['fail', 'fail', 'c200ccc']);
  });
});
