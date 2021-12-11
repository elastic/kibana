/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExportExceptionDetails } from '.';

export interface ExportExceptionDetailsMock {
  listCount?: number;
  missingListsCount?: number;
  missingLists?: Array<Record<'list_id', string>>;
  itemCount?: number;
  missingItemCount?: number;
  missingItems?: Array<Record<'item_id', string>>;
}

export const getExceptionExportDetailsMock = (
  details?: ExportExceptionDetailsMock
): ExportExceptionDetails => ({
  exported_exception_list_count: details?.listCount ?? 0,
  exported_exception_list_item_count: details?.itemCount ?? 0,
  missing_exception_list_item_count: details?.missingItemCount ?? 0,
  missing_exception_list_items: details?.missingItems ?? [],
  missing_exception_lists: details?.missingLists ?? [],
  missing_exception_lists_count: details?.missingListsCount ?? 0,
});
