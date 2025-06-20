/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord, PARENT_ID_FIELD, TRANSACTION_NAME_FIELD } from '@kbn/discover-utils';

export const isSpanHit = (hit: DataTableRecord | null): boolean => {
  return !!hit?.flattened[PARENT_ID_FIELD] && !hit?.flattened[TRANSACTION_NAME_FIELD];
};
