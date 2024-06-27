/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocumentContext } from './profiles';
import type { ContextWithProfileId } from './profile_service';

export interface DataTableRecordWithContext extends DataTableRecord {
  context: ContextWithProfileId<DocumentContext>;
}

export const recordHasContext = (
  record: DataTableRecord | undefined
): record is DataTableRecordWithContext => {
  return Boolean(record && 'context' in record);
};
