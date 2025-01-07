/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';

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
