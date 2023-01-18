/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsCreateOptions } from './create';

/**
 * Per-object parameters for bulk create operation
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsBulkCreateObject<T = unknown> extends SavedObjectsCreateOptions {
  /** Create a SavedObject of this type. */
  type: string;
  /** Attributes for the saved object to be created. */
  attributes: T;
}

/**
 * Options for bulk create operation
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 * */
export interface SavedObjectsBulkCreateOptions {
  /** If a document with the given `id` already exists, overwrite its contents (default=false). */
  overwrite?: boolean;
}
