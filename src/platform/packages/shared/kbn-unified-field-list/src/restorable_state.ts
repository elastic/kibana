/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRestorableStateProvider } from '@kbn/restorable-state';
import type { FieldTypeKnown } from '@kbn/field-utils';

export interface UnifiedFieldListRestorableState {
  /**
   * Whether the field list is collapsed or expanded
   */
  isCollapsed: boolean;
  /**
   * Field search
   */
  nameFilter: string;
  /**
   * Field type filters
   */
  selectedFieldTypes: FieldTypeKnown[];
  /**
   * The number of actually rendered (visible) fields
   */
  pageSize: number;
  /**
   * Scroll position inside the field list
   */
  scrollTop: number;
  /**
   * Which sections of the field list are expanded
   */
  accordionState: Record<string, boolean>;
}

export const { withRestorableState, useRestorableState, useRestorableRef } =
  createRestorableStateProvider<UnifiedFieldListRestorableState>();
