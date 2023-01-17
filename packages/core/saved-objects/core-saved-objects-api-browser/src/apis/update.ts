/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';

/**
 * Options for updating a saved object
 *
 * @public
 * @deprecated See https://github.com/elastic/dev/issues/2194
 */
export interface SavedObjectsUpdateOptions<Attributes = unknown> {
  /** version of the saved object */
  version?: string;
  /** Alternative attributes for the saved object if upserting */
  upsert?: Attributes;
  /** Array of references to other saved objects */
  references?: SavedObjectReference[];
}
