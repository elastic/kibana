/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord, PROCESSOR_EVENT_FIELD } from '@kbn/discover-utils';
import { getFlattenedFields } from '@kbn/discover-utils/src/utils/get_flattened_fields';

export const isSpanHit = (hit: DataTableRecord | null): boolean => {
  if (!hit?.flattened) {
    return false;
  }

  const processorEvent = getFlattenedFields<{ [PROCESSOR_EVENT_FIELD]: string }>(hit, [
    PROCESSOR_EVENT_FIELD,
  ])[PROCESSOR_EVENT_FIELD];

  const isOtelSpan = processorEvent == null;
  const isApmSpan = processorEvent === 'span';

  return isApmSpan || isOtelSpan;
};
