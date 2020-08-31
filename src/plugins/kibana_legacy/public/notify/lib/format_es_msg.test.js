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

import { formatESMsg } from './format_es_msg';
import expect from '@kbn/expect';

describe('formatESMsg', () => {
  test('should return undefined if passed a basic error', () => {
    const err = new Error('This is a normal error');

    const actual = formatESMsg(err);

    expect(actual).to.be(undefined);
  });

  test('should return undefined if passed a string', () => {
    const err = 'This is a error string';

    const actual = formatESMsg(err);

    expect(actual).to.be(undefined);
  });

  test('should return the root_cause if passed an extended elasticsearch', () => {
    const err = new Error('This is an elasticsearch error');
    err.resp = {
      error: {
        root_cause: [
          {
            reason: 'I am the detailed message',
          },
        ],
      },
    };

    const actual = formatESMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });

  test('should combine the reason messages if more than one is returned.', () => {
    const err = new Error('This is an elasticsearch error');
    err.resp = {
      error: {
        root_cause: [
          {
            reason: 'I am the detailed message 1',
          },
          {
            reason: 'I am the detailed message 2',
          },
        ],
      },
    };

    const actual = formatESMsg(err);

    expect(actual).to.equal('I am the detailed message 1\nI am the detailed message 2');
  });
});
