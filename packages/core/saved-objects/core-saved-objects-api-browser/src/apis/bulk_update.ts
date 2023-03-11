/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';

/**
 * Per-object parameters for bulk update operation
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsBulkUpdateObject<T = unknown> {
  /** Type of the saved object to update */
  type: string;
  /** ID of the saved object to update */
  id: string;
  /** The attributes to update */
  attributes: T;
  /** The version string for the saved object */
  version?: string;
  /** Array of references to other saved objects */
  references?: SavedObjectReference[];
}

/**
 * Options for bulk update operation
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 * */
export interface SavedObjectsBulkUpdateOptions {
  /**
   * The namespace from which to apply the bulk update operation
   * Not permitted if spaces extension is enabled
   */
  namespace?: string;
}
