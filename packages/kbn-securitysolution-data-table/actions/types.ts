/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CellAction, CellActionExecutionContext, CellActionFactory } from '@kbn/cell-actions';

export interface SecurityMetadata extends Record<string, unknown> {
  /**
   * `metadata.scopeId` is used by some actions (e.g. filterIn/Out) to discriminate the Timeline
   * and the DataTables scope (alerts, events, rules preview..) in the actions execution.
   * It is required when cellActions are rendered inside the Timeline or dataTables,
   * it can be omitted otherwise.
   */
  scopeId?: string;
  /**
   * `metadata.isObjectArray` is used to display extended tooltip information
   * for fields that have multiple values
   */
  isObjectArray?: boolean;
  /**
   * `metadata.negateFilters` is used by some actions (e.g. filterIn/Out and addToTimeline) to negate
   * the usual filtering behavior. This is used in special cases where the displayed value is computed
   * and we need all the filtering actions to perform the opposite (negate) operation.
   */
  negateFilters?: boolean;
}

export interface SecurityCellActionExecutionContext extends CellActionExecutionContext {
  metadata: SecurityMetadata | undefined;
}
export type SecurityCellAction = CellAction<SecurityCellActionExecutionContext>;

// All security cell actions names
export type SecurityCellActionName =
  | 'filterIn'
  | 'filterOut'
  | 'addToTimeline'
  | 'showTopN'
  | 'copyToClipboard'
  | 'toggleColumn';

export type SecurityCellActions = Record<SecurityCellActionName, CellActionFactory>;
