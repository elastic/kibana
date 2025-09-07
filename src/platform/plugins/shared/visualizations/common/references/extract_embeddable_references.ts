/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { extractReferences as extractSearchSourceReferences } from '@kbn/data-plugin/common';
import { isObject } from 'lodash';
import type { SavedVisState, SerializedVis } from '../types';
import { extractControlsReferences } from './controls_references';
import { extractTimeSeriesReferences } from './timeseries_references';

const isValidSavedVis = (savedVis: unknown): savedVis is SavedVisState =>
  isObject(savedVis) && 'type' in savedVis && 'params' in savedVis;

// Data plugin's `isSerializedSearchSource` does not actually rule out objects that aren't serialized search source fields
function isSerializedSearchSource(
  maybeSerializedSearchSource: unknown
): maybeSerializedSearchSource is SerializedSearchSourceFields {
  return (
    typeof maybeSerializedSearchSource === 'object' &&
    maybeSerializedSearchSource !== null &&
    !Object.hasOwn(maybeSerializedSearchSource, 'dependencies') &&
    !Object.hasOwn(maybeSerializedSearchSource, 'fields')
  );
}

export function extractEmbeddableReferences(savedVis: SerializedVis) {
  const { searchSource, savedSearchId } = savedVis.data;
  const references: Reference[] = [];
  let serializedSearchSource = searchSource;

  // TSVB uses legacy visualization state, which doesn't serialize search source properly
  if (!isSerializedSearchSource(searchSource)) {
    serializedSearchSource = (searchSource as { fields: SerializedSearchSourceFields }).fields;
  }

  if (searchSource) {
    const [extractedSearchSource, searchSourceReferences] =
      extractSearchSourceReferences(serializedSearchSource);
    serializedSearchSource = extractedSearchSource;
    searchSourceReferences.forEach((r) => references.push(r));
  }

  // Extract saved search
  if (savedSearchId) {
    references.push({
      name: 'search_0',
      type: 'search',
      id: String(savedSearchId),
    });
  }

  // Extract index patterns from controls
  if (isValidSavedVis(savedVis)) {
    extractControlsReferences(savedVis.type, savedVis.params, references);
    extractTimeSeriesReferences(savedVis.type, savedVis.params, references);
  }

  return { references, serializedSearchSource };
}
