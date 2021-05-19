/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { page, per_page, total } from '../../common';
import { exceptionListItemSchema } from '../exception_list_item_schema';

export const foundExceptionListItemSchema = t.exact(
  t.type({
    data: t.array(exceptionListItemSchema),
    page,
    per_page,
    total,
  })
);

export type FoundExceptionListItemSchema = t.TypeOf<typeof foundExceptionListItemSchema>;
