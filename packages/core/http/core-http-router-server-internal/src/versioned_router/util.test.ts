/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { VersionedRouteResponseValidation } from '@kbn/core-http-server';
import { isCustomValidation, unwrapVersionedResponseBodyValidation } from './util';

test.each([
  [() => schema.object({}), false],
  [{ custom: () => ({ value: 1 }) }, true],
])('isCustomValidation correctly detects custom validation %#', (input, result) => {
  expect(isCustomValidation(input)).toBe(result);
});

test('unwrapVersionedResponseBodyValidation', () => {
  const mySchema = schema.object({});
  const custom = () => ({ value: 'ok' });
  const validation: VersionedRouteResponseValidation = {
    200: {
      body: () => mySchema,
    },
    404: {
      body: { custom },
    },
  };

  expect(unwrapVersionedResponseBodyValidation(validation[200].body)).toBe(mySchema);
  expect(unwrapVersionedResponseBodyValidation(validation[404].body)).toBe(custom);
});
