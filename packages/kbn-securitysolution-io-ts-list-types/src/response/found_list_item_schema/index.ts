/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { cursor, page, per_page, total } from '../../common';
import { listItemSchema } from '../list_item_schema';

export const foundListItemSchema = t.exact(
  t.type({
    cursor,
    data: t.array(listItemSchema),
    page,
    per_page,
    total,
  })
);

export type FoundListItemSchema = t.TypeOf<typeof foundListItemSchema>;
