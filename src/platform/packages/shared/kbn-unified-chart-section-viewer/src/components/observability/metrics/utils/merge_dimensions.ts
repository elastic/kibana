/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dimension } from '../../../../types';

/**
 * Merges new dimensions into an accumulated set, preserving previously-seen
 * dimensions that may no longer appear in filtered METRICS_INFO responses.
 *
 * This prevents the dimension picker from losing options when the user selects
 * multiple breakdown dimensions, which causes the METRICS_INFO query to add
 * WHERE filters that narrow the result set.
 *
 * @param accumulated - Previously accumulated dimensions (the "high-water mark")
 * @param incoming - Dimensions from the latest METRICS_INFO response
 * @returns Merged dimension list with no duplicates, sorted alphabetically
 */
export const mergeDimensions = (accumulated: Dimension[], incoming: Dimension[]): Dimension[] => {
  const merged = new Map<string, Dimension>();

  for (const dim of accumulated) {
    merged.set(dim.name, dim);
  }

  // Incoming dimensions may have updated type info, so they take precedence
  for (const dim of incoming) {
    merged.set(dim.name, dim);
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
};
