/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NonEmptyString, PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

// We use id: t.string intentionally and _never_ the id from global schemas as
// sometimes echo back out the id that the user gave us and it is not guaranteed
// to be a UUID but rather just a string
const partial = t.exact(
  t.partial({
    id: t.string,
    rule_id: NonEmptyString,
    list_id: NonEmptyString,
    item_id: NonEmptyString,
  })
);
const required = t.exact(
  t.type({
    error: t.type({
      status_code: PositiveInteger,
      message: t.string,
    }),
  })
);

export const ErrorSchema = t.intersection([partial, required]);
export type ErrorSchema = t.TypeOf<typeof ErrorSchema>;
