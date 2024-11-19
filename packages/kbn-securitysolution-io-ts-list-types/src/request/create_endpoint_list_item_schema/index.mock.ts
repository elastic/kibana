/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CreateEndpointListItemSchema } from '.';
import {
  COMMENTS,
  DESCRIPTION,
  ENDPOINT_ENTRIES,
  ITEM_TYPE,
  META,
  NAME,
  OS_TYPES,
  TAGS,
} from '../../constants/index.mock';

export const getCreateEndpointListItemSchemaMock = (): CreateEndpointListItemSchema => ({
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENDPOINT_ENTRIES,
  item_id: undefined,
  meta: META,
  name: NAME,
  os_types: OS_TYPES,
  tags: TAGS,
  type: ITEM_TYPE,
});
