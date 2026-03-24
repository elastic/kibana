/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import {
  extractReferences as extractSearchSourceReferences,
  injectReferences as injectSearchSourceReferences,
} from '@kbn/data-plugin/common';
import type { StoredVis } from '../embeddable/transforms/types';
import { injectControlsReferences } from './controls_references';
import { injectTimeSeriesReferences } from './timeseries_references';
import type { SerializedVis } from '../types';
import { DISCOVER_SESSION_REF_NAME } from './extract_vis_references';

export function injectVisReferences(savedVis: StoredVis, references: Reference[]): SerializedVis {
  const { searchSource, savedSearchRefName, ...restOfData } = savedVis.data;

  let injectedSearchSource = searchSource;
  if (searchSource) {
    try {
      // due to a bug in 8.0, some visualizations were saved with an injected state - re-extract in that case and inject the upstream references because they might have changed
      if (searchSource.index && !searchSource.indexRefName) {
        const extractResults = extractSearchSourceReferences(searchSource);
        injectedSearchSource = injectSearchSourceReferences(extractResults[0], [
          ...references,
          ...extractResults[1],
        ]);
      } else {
        injectedSearchSource = injectSearchSourceReferences(searchSource, references);
      }
    } catch (e) {
      // Allow missing index pattern error to surface in vis
    }
  }

  if (savedVis.params) {
    // side effect mutates savedVis.params
    injectControlsReferences(savedVis.type, savedVis.params, references);
    // side effect mutates savedVis.params
    injectTimeSeriesReferences(savedVis.type, savedVis.params, references);
  }

  const savedSearchRef = references.find(
    (reference) => reference.name === DISCOVER_SESSION_REF_NAME
  );

  return {
    ...savedVis,
    data: {
      ...restOfData,
      searchSource: injectedSearchSource,
      ...(savedSearchRef ? { savedSearchId: savedSearchRef.id } : {}),
    },
  };
}
