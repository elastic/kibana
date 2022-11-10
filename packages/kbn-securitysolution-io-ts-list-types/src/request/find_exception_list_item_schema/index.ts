/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import {
  EmptyStringArray,
  EmptyStringArrayDecoded,
  NonEmptyStringArray,
  StringToPositiveNumber,
} from '@kbn/securitysolution-io-ts-types';

import {
  DefaultNamespaceArray,
  DefaultNamespaceArrayTypeDecoded,
} from '../../common/default_namespace_array';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { sort_field } from '../../common/sort_field';
import { sort_order } from '../../common/sort_order';
import { search } from '../../common/search';

export const findExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      list_id: NonEmptyStringArray,
    })
  ),
  t.exact(
    t.partial({
      filter: EmptyStringArray, // defaults to an empty array [] if not set during decode
      namespace_type: DefaultNamespaceArray, // defaults to ['single'] if not set during decode
      page: StringToPositiveNumber, // defaults to undefined if not set during decode
      per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
      search,
      sort_field, // defaults to undefined if not set during decode
      sort_order, // defaults to undefined if not set during decode
    })
  ),
]);

export type FindExceptionListItemSchema = t.OutputOf<typeof findExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof findExceptionListItemSchema>>,
  'namespace_type' | 'filter'
> & {
  filter: EmptyStringArrayDecoded;
  namespace_type: DefaultNamespaceArrayTypeDecoded;
};
