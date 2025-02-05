/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { left, right } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { validate, validateEither } from '.';

describe('validate', () => {
  test('it should do a validation correctly', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 1 };
    const [validated, errors] = validate(payload, schema);

    expect(validated).toEqual(payload);
    expect(errors).toEqual(null);
  });

  test('it should do an in-validation correctly', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 'some other value' };
    const [validated, errors] = validate(payload, schema);

    expect(validated).toEqual(null);
    expect(errors).toEqual('Invalid value "some other value" supplied to "a"');
  });
});

describe('validateEither', () => {
  it('returns the ORIGINAL payload as right if valid', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 1 };
    const result = validateEither(schema, payload);

    expect(result).toEqual(right(payload));
  });

  it('returns an error string if invalid', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 'some other value' };
    const result = validateEither(schema, payload);

    expect(result).toEqual(left(new Error('Invalid value "some other value" supplied to "a"')));
  });
});
