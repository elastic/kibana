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

import Boom from 'boom';

import { decodeVersion } from './decode_version';

describe('decodeVersion', () => {
  it('parses version back into {_seq_no,_primary_term} object', () => {
    expect(decodeVersion('WzQsMV0=')).toMatchInlineSnapshot(`
Object {
  "_primary_term": 1,
  "_seq_no": 4,
}
`);
  });

  it('throws Boom error if not in base64', () => {
    let error;
    try {
      decodeVersion('[1,4]');
    } catch (err) {
      error = err;
    }

    expect(error.message).toMatchInlineSnapshot(`"Invalid version [[1,4]]"`);
    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output).toMatchInlineSnapshot(`
Object {
  "headers": Object {},
  "payload": Object {
    "error": "Bad Request",
    "message": "Invalid version [[1,4]]",
    "statusCode": 400,
  },
  "statusCode": 400,
}
`);
  });

  it('throws if not JSON encoded', () => {
    let error;
    try {
      decodeVersion('MSwy');
    } catch (err) {
      error = err;
    }

    expect(error.message).toMatchInlineSnapshot(`"Invalid version [MSwy]"`);
    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output).toMatchInlineSnapshot(`
Object {
  "headers": Object {},
  "payload": Object {
    "error": "Bad Request",
    "message": "Invalid version [MSwy]",
    "statusCode": 400,
  },
  "statusCode": 400,
}
`);
  });

  it('throws if either value is not an integer', () => {
    let error;
    try {
      decodeVersion('WzEsMy41XQ==');
    } catch (err) {
      error = err;
    }

    expect(error.message).toMatchInlineSnapshot(`"Invalid version [WzEsMy41XQ==]"`);
    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output).toMatchInlineSnapshot(`
Object {
  "headers": Object {},
  "payload": Object {
    "error": "Bad Request",
    "message": "Invalid version [WzEsMy41XQ==]",
    "statusCode": 400,
  },
  "statusCode": 400,
}
`);
  });
});
