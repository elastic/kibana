/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { nonEmptyOrNullableStringArray } from '../../../non_empty_or_nullable_string_array';
import { operatorIncluded } from '../../../operator';
import { NonEmptyString } from '../../../non_empty_string';

export const endpointEntryMatchAny = t.exact(
  t.type({
    field: NonEmptyString,
    operator: operatorIncluded,
    type: t.keyof({ match_any: null }),
    value: nonEmptyOrNullableStringArray,
  })
);
export type EndpointEntryMatchAny = t.TypeOf<typeof endpointEntryMatchAny>;
