/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LIST_ITEM_ID, META, VALUE } from '../../constants/index.mock';

import { PatchListItemSchema } from '.';

export const getPathListItemSchemaMock = (): PatchListItemSchema => ({
  id: LIST_ITEM_ID,
  meta: META,
  value: VALUE,
});
