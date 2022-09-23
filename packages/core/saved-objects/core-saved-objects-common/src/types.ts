/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * An identifier for a saved object within a space.
 *
 * @public
 */
export interface SavedObjectTypeIdTuple {
  /** The id of the saved object */
  id: string;
  /** The type of the saved object */
  type: string;
}
