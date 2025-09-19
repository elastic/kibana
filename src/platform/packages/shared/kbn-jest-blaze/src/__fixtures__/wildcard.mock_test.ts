/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable @kbn/imports/no_unresolvable_imports */
// @ts-expect-error
import { baz } from './barrel';

describe('Wildcard Re-export Test', () => {
  test('should import from wildcard re-export and get rewritten', () => {
    expect(baz).toBe('baz');
  });
});
