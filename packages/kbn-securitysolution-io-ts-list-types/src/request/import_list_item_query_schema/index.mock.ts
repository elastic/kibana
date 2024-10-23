/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LIST_ID, TYPE } from '../../constants/index.mock';

import { ImportListItemQuerySchema } from '.';

export const getImportListItemQuerySchemaMock = (): ImportListItemQuerySchema => ({
  deserializer: undefined,
  list_id: LIST_ID,
  serializer: undefined,
  type: TYPE,
  refresh: 'false',
});
