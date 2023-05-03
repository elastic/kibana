/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z, extractErrorMessage } from '..';

test('formats error message as expected with object types', () => {
  const type = z.union([z.object({ age: z.number() }), z.string()]);
  const result = type.safeParse({ age: 'foo' });
  if (result.success) fail('expected validation to fail!');
  expect(extractErrorMessage(result.error)).toMatchInlineSnapshot(`
    "expected one of:
      | { [age]: number } but got { [age]: string }
      | [string] but got [object]
    "
  `);
});

test('formats error message as expected for nested unions', () => {
  const type = z.union([
    z.union([z.boolean(), z.string()]),
    z.union([z.union([z.object({ foo: z.string() }), z.number()]), z.never()]),
  ]);
  const result = type.safeParse({ age: 'foo' });
  if (result.success) fail('expected validation to fail!');
  expect(extractErrorMessage(result.error)).toMatchInlineSnapshot(`
    "expected one of:
      | [boolean] but got [object]
      | [string] but got [object]
      | { [foo]: string } but got { [foo]: undefined }
      | [number] but got [object]
      | [never] but got [object]
    "
  `);
});
