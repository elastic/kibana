/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as rt from 'io-ts';

export interface IsGreaterOrEqualBrand {
  readonly IsGreaterOrEqual: unique symbol;
}

export type IsGreaterOrEqual = rt.Branded<number, IsGreaterOrEqualBrand>;

export const isGreaterOrEqualRt = (value: number) =>
  rt.brand(
    rt.number, // codec
    (n): n is IsGreaterOrEqual => n >= value,
    // refinement of the number type
    'IsGreaterOrEqual' // name of this codec
  );
