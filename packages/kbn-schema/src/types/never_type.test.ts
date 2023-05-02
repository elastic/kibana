/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';

test('throws on any value set', () => {
  const type = schema.never();

  expect(() => type.validate(1)).toThrowErrorMatchingInlineSnapshot(
    `"a value wasn't expected to be present"`
  );
  expect(() => type.validate('a')).toThrowErrorMatchingInlineSnapshot(
    `"a value wasn't expected to be present"`
  );
  expect(() => type.validate(null)).toThrowErrorMatchingInlineSnapshot(
    `"a value wasn't expected to be present"`
  );
  expect(() => type.validate({})).toThrowErrorMatchingInlineSnapshot(
    `"a value wasn't expected to be present"`
  );
  expect(() => type.validate(undefined)).not.toThrow();
});

test('throws on value set as object property', () => {
  const type = schema.object({
    name: schema.never(),
    status: schema.string(),
  });

  expect(() =>
    type.validate({ name: 'name', status: 'in progress' })
  ).toThrowErrorMatchingInlineSnapshot(`"[name]: a value wasn't expected to be present"`);

  expect(() => type.validate({ status: 'in progress' })).not.toThrow();
  expect(() => type.validate({ name: undefined, status: 'in progress' })).not.toThrow();
});
