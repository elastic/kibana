/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

import { type } from '../type';
import { listOperator as operator } from '../list_operator';

export const entriesList = t.exact(
  t.type({
    field: NonEmptyString,
    list: t.exact(t.type({ id: NonEmptyString, type })),
    operator,
    type: t.keyof({ list: null }),
  })
);
export type EntryList = t.TypeOf<typeof entriesList>;
