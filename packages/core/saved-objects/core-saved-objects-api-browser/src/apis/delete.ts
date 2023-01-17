/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Options for deleting a saved object.
 *
 * @public
 * @deprecated See https://github.com/elastic/dev/issues/2194
 */
export interface SavedObjectsDeleteOptions {
  /** Force deletion of an object that exists in multiple namespaces (default=false) */
  force?: boolean;
}
