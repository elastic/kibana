/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { either } from 'fp-ts';
import * as rt from 'io-ts';
import { createLiteralValueFromUndefinedRT } from '.';

describe('LiteralValueFromUndefined runtime type', () => {
  it('decodes undefined to a given literal value', () => {
    expect(createLiteralValueFromUndefinedRT('SOME_VALUE').decode(undefined)).toEqual(
      either.right('SOME_VALUE')
    );
  });

  it('can be used to define default values when decoding', () => {
    expect(
      rt.union([rt.boolean, createLiteralValueFromUndefinedRT(true)]).decode(undefined)
    ).toEqual(either.right(true));
  });

  it('rejects other values', () => {
    expect(
      either.isLeft(createLiteralValueFromUndefinedRT('SOME_VALUE').decode('DEFINED'))
    ).toBeTruthy();
  });
});
