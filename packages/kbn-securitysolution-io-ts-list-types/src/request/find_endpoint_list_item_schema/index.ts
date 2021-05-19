/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { StringToPositiveNumber } from '@kbn/securitysolution-io-ts-types';

import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { filter } from '../../common/filter';
import { sort_field } from '../../common/sort_field';
import { sort_order } from '../../common/sort_order';

export const findEndpointListItemSchema = t.exact(
  t.partial({
    filter, // defaults to undefined if not set during decode
    page: StringToPositiveNumber, // defaults to undefined if not set during decode
    per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
    sort_field, // defaults to undefined if not set during decode
    sort_order, // defaults to undefined if not set during decode
  })
);

export type FindEndpointListItemSchema = t.OutputOf<typeof findEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindEndpointListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof findEndpointListItemSchema>
>;
