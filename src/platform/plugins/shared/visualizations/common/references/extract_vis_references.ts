/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { extractReferences as extractSearchSourceReferences } from '@kbn/data-plugin/common';
import type { SerializedVis } from '../types';
import { extractControlsReferences } from './controls_references';
import { extractTimeSeriesReferences } from './timeseries_references';
import type { StoredVis } from '../embeddable/transforms/types';

export const DISCOVER_SESSION_REF_NAME = 'search_0';

export function extractVisReferences(savedVis: SerializedVis) {
  const { searchSource, savedSearchId, ...restOfData } = savedVis.data;
  const references: Reference[] = [];

  let extractedSearchSource = searchSource;
  if (extractedSearchSource) {
    const results = extractSearchSourceReferences(extractedSearchSource);
    extractedSearchSource = results[0];
    references.push(...results[1]);
  }

  // Extract discover session
  if (savedSearchId) {
    references.push({
      name: DISCOVER_SESSION_REF_NAME,
      type: 'search',
      id: String(savedSearchId),
    });
  }

  // Extract index patterns from controls
  if (savedVis.params) {
    // side effect mutates savedVis.params and references
    extractControlsReferences(savedVis.type, savedVis.params, references);
    // side effect mutates savedVis.params and references
    extractTimeSeriesReferences(savedVis.type, savedVis.params, references);
  }

  return {
    savedVis: {
      ...savedVis,
      data: {
        ...restOfData,
        searchSource: extractedSearchSource,
        ...(savedSearchId
          ? {
              savedSearchRefName: DISCOVER_SESSION_REF_NAME,
            }
          : {}),
      },
    } as StoredVis,
    references,
  };
}
