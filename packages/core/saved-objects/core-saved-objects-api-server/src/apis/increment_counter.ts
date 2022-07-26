/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 * @public
 */
export interface SavedObjectsIncrementCounterOptions<Attributes = unknown>
  extends SavedObjectsBaseOptions {
  /**
   * (default=false) If true, sets all the counter fields to 0 if they don't
   * already exist. Existing fields will be left as-is and won't be incremented.
   */
  initialize?: boolean;
  /** {@link SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /**
   * (default='wait_for') The Elasticsearch refresh setting for this
   * operation. See {@link MutatingOperationRefreshSetting}
   */
  refresh?: MutatingOperationRefreshSetting;
  /**
   * Attributes to use when upserting the document if it doesn't exist.
   */
  upsertAttributes?: Attributes;
}

/**
 * @public
 */
export interface SavedObjectsIncrementCounterField {
  /** The field name to increment the counter by.*/
  fieldName: string;
  /** The number to increment the field by (defaults to 1).*/
  incrementBy?: number;
}
