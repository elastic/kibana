/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

// from https://github.com/gcanti/io-ts-types/blob/master/src/NonEmptyString.ts

export interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol;
}

export type NonEmptyString = t.Branded<string, NonEmptyStringBrand>;

export const nonEmptyStringRt = t.brand(
  t.string,
  (str): str is NonEmptyString => str.length > 0,
  'NonEmptyString'
);
