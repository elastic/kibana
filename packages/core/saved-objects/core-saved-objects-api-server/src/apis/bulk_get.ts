/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Object parameters for the bulk get operation
 *
 * @public
 */
export interface SavedObjectsBulkGetObject {
  /** ID of the object to get */
  id: string;
  /** Type of the object to get */
  type: string;
  /** SavedObject fields to include in the response */
  fields?: string[];
  /**
   * Optional namespace(s) for the object to be retrieved in. If this is defined, it will supersede the namespace ID that is in the
   * top-level options.
   *
   * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
   *   including the "All spaces" identifier (`'*'`).
   * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
   *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
   * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
   */
  namespaces?: string[];
}
