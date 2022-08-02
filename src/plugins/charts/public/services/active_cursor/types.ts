/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PointerEvent } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/public';

/** @public **/
export type ActiveCursorSyncOption = DateHistogramSyncOption | DatatablesSyncOption;

/** @internal **/
export interface ActiveCursorPayload {
  cursor: PointerEvent;
  isDateHistogram?: boolean;
  accessors?: string[];
}

/** @internal **/
interface BaseSyncOptions {
  debounce?: number;
}

/** @internal **/
export interface DateHistogramSyncOption extends BaseSyncOptions {
  isDateHistogram: boolean;
}

/** @internal **/
export interface DatatablesSyncOption extends BaseSyncOptions {
  datatables: Datatable[];
}
