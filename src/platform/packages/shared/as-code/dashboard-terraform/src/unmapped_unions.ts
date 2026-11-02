/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasDocument } from './oas_model';
import { compileDashboardRoot } from './oas_model';

export interface UnmappedUnionsReport {
  /** JSON leaves no annotation asked for that are missing from the list of accepted JSON leaves. */
  unlisted: string[];
  /** Entries of the list of accepted JSON leaves that no longer become a JSON leaf by convention. */
  stale: string[];
}

/**
 * Compares the JSON leaves of the dashboard resource that no annotation asked for (unions of objects with no
 * `x-tf-union`, properties merged variants define differently) against the list of accepted JSON leaves.
 */
export const checkUnmappedUnions = (
  doc: OasDocument,
  accepted: readonly string[]
): UnmappedUnionsReport => {
  const { compiler } = compileDashboardRoot(doc);
  const { implicitJsonLeaves } = compiler;
  const acceptedSet = new Set(accepted);
  return {
    unlisted: [...implicitJsonLeaves].filter((location) => !acceptedSet.has(location)).sort(),
    stale: [...acceptedSet].filter((location) => !implicitJsonLeaves.has(location)).sort(),
  };
};
