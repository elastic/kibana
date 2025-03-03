/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsBaseOptions } from './base';

/**
 *
 * @public
 */
export interface SavedObjectsRemoveReferencesToOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation. Defaults to `true` */
  refresh?: boolean;
}

/**
 *
 * @public
 */
export interface SavedObjectsRemoveReferencesToResponse extends SavedObjectsBaseOptions {
  /** The number of objects that have been updated by this operation */
  updated: number;
}
