/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { BulkOperation } from '../model/create_batches';

export const redactBulkOperationBatches = (
  bulkOperationBatches: BulkOperation[][]
): BulkOperationContainer[][] => {
  return bulkOperationBatches.map((batch) =>
    batch.map((operation) => (Array.isArray(operation) ? operation[0] : operation))
  );
};
