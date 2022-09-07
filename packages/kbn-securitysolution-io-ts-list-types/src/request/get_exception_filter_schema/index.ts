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
  exceptionListId: t.string,
  namespaceType,
});

export const exceptionListIds = t.type({
  exceptionListIds: t.array(exceptionListId),
  type: t.literal('exceptionListIds'),
});

export const exceptions = t.type({
  exceptions: t.array(t.union([exceptionListItemSchema, createExceptionListItemSchema])),
  type: t.literal('exceptionItems'),
});

const optionalExceptionParams = t.exact(
  t.partial({ alias: t.string, chunkSize: t.number, excludeExceptions: t.boolean })
);

export const getExceptionFilterSchema = t.intersection([
  t.union([exceptions, exceptionListIds]),
  optionalExceptionParams,
]);

export type GetExceptionFilterSchema = t.TypeOf<typeof getExceptionFilterSchema>;
export type ExceptionListId = t.TypeOf<typeof exceptionListId>;
