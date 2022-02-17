/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

import { id } from '../../common/id';
import { list_id } from '../../common/list_id';
import { item_id } from '../../common/item_id';

export const bulkErrorErrorSchema = t.exact(
  t.type({
    status_code: t.number,
    message: t.string,
  })
);

export const bulkErrorSchema = t.intersection([
  t.exact(
    t.type({
      error: bulkErrorErrorSchema,
    })
  ),
  t.partial({
    id,
    list_id,
    item_id,
  }),
]);

export type BulkErrorSchema = t.TypeOf<typeof bulkErrorSchema>;

export const importExceptionsResponseSchema = t.exact(
  t.type({
    errors: t.array(bulkErrorSchema),
    success: t.boolean,
    success_count: PositiveInteger,
    success_exception_lists: t.boolean,
    success_count_exception_lists: PositiveInteger,
    success_exception_list_items: t.boolean,
    success_count_exception_list_items: PositiveInteger,
  })
);

export type ImportExceptionsResponseSchema = t.TypeOf<typeof importExceptionsResponseSchema>;
