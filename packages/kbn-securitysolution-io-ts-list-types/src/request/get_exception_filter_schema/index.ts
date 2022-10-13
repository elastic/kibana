/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { namespaceType } from '../../common/default_namespace';
import { exceptionListItemSchema } from '../../response';
import { createExceptionListItemSchema } from '../create_exception_list_item_schema';

const exceptionListId = t.type({
  exception_list_id: t.string,
  namespace_type: namespaceType,
});

export const exceptionListIds = t.type({
  exception_list_ids: t.array(exceptionListId),
  type: t.literal('exception_list_ids'),
});

export const exceptions = t.type({
  exceptions: t.array(t.union([exceptionListItemSchema, createExceptionListItemSchema])),
  type: t.literal('exception_items'),
});

const optionalExceptionParams = t.exact(
  t.partial({ alias: t.string, chunk_size: t.number, exclude_exceptions: t.boolean })
);

export const getExceptionFilterSchema = t.intersection([
  t.union([exceptions, exceptionListIds]),
  optionalExceptionParams,
]);

export type GetExceptionFilterSchema = t.TypeOf<typeof getExceptionFilterSchema>;
export type ExceptionListId = t.TypeOf<typeof exceptionListId>;
