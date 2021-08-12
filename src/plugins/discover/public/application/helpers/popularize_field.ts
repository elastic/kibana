/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern, IndexPatternsContract } from '../../../../data/public';
import { getServices } from '../../kibana_services';

async function popularizeField(
  indexPattern: IndexPattern,
  fieldName: string,
  indexPatternsService: IndexPatternsContract
) {
  const { capabilities } = getServices();
  if (!indexPattern.id || !capabilities.indexPatterns.save) return;
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
