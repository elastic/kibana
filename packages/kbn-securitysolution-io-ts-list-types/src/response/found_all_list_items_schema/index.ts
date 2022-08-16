/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { listItemSchema } from '../list_item_schema';
import { total } from '../../common/total';

export const foundAllListItemsSchema = t.exact(
  t.type({
    data: t.array(listItemSchema),
    total,
  })
);

export type FoundAllListItemsSchema = t.TypeOf<typeof foundAllListItemsSchema>;
