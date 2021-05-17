/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { NonEmptyString, nonEmptyOrNullableStringArray } from '@kbn/securitysolution-io-ts-types';
import { listOperator as operator } from '../list_operator';

export const entriesMatchAny = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ match_any: null }),
    value: nonEmptyOrNullableStringArray,
  })
);
export type EntryMatchAny = t.TypeOf<typeof entriesMatchAny>;
