/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Summary of unique creators from the current item set.
 *
 * Derived from either server-provided counts or a client-side item scan.
 * Used by the "Created by" filter popover to build its option list.
 */
export interface CreatorsList {
  /** Real user UIDs (excludes sentinel values). */
  uids: string[];
  /** Whether any items have no `createdBy` value. */
  hasNoCreator: boolean;
  /** Whether any items are system-managed. */
  hasManaged: boolean;
}
