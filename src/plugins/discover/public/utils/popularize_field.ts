/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Capabilities } from '@kbn/core/public';
import { DataViewsContract } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';

async function popularizeField(
  dataView: DataView,
  fieldName: string,
  DataViewsService: DataViewsContract,
  capabilities: Capabilities
) {
  if (!dataView.id || !capabilities?.indexPatterns?.save) return;
  const field = dataView.fields.getByName(fieldName);
  if (!field) {
    return;
  }

  field.count++;

  if (!dataView.isPersisted()) {
    return;
  }

  // Catch 409 errors caused by user adding columns in a higher frequency that the changes can be persisted to Elasticsearch
  try {
    await DataViewsService.updateSavedObject(dataView, 0, true);
    // eslint-disable-next-line no-empty
  } catch {}
}

export { popularizeField };
