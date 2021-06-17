/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LIST_ID, LIST_ITEM_ID, VALUE } from '../../constants/index.mock';

import { ReadListItemSchema } from '.';

export const getReadListItemSchemaMock = (): ReadListItemSchema => ({
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  value: VALUE,
});
