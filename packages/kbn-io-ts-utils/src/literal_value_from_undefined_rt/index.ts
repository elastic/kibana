/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';

export const createLiteralValueFromUndefinedRT = <LiteralValue extends string | number | boolean>(
  literalValue: LiteralValue
) =>
  rt.undefined.pipe(
    new rt.Type<LiteralValue, undefined, unknown>(
      'BooleanFromString',
      rt.literal(literalValue).is,
      (_value, _context) => rt.success(literalValue),
      () => undefined
    )
  );
