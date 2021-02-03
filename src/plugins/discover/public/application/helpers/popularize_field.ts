/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPattern, IndexPatternsService } from '../../../../data/public';

async function popularizeField(
  indexPattern: IndexPattern,
  fieldName: string,
  indexPatternsService: IndexPatternsService
) {
  if (!indexPattern.id) return;
  const field = indexPattern.fields.getByName(fieldName);
  if (!field) {
    return;
  }

  field.count++;

  // Catch 409 errors caused by user adding columns in a higher frequency that the changes can be persisted to Elasticsearch
  try {
    await indexPatternsService.updateSavedObject(indexPattern, 0, true);
    // eslint-disable-next-line no-empty
  } catch {}
}

export { popularizeField };
