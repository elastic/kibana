/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { StringToPositiveNumber } from '@kbn/securitysolution-io-ts-types';
import { cursor } from '../../common/cursor';
import { filter } from '../../common/filter';
import { sort_field } from '../../common/sort_field';
import { sort_order } from '../../common/sort_order';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';

export const findListSchema = t.exact(
  t.partial({
    cursor, // defaults to undefined if not set during decode
    filter, // defaults to undefined if not set during decode
    page: StringToPositiveNumber, // defaults to undefined if not set during decode
    per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
    sort_field, // defaults to undefined if not set during decode
    sort_order, // defaults to undefined if not set during decode
  })
);

export type FindListSchema = RequiredKeepUndefined<t.TypeOf<typeof findListSchema>>;
export type FindListSchemaEncoded = t.OutputOf<typeof findListSchema>;
