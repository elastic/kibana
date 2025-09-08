/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { injectReferences as injectSearchSourceReferences } from '@kbn/data-plugin/common';
import type { StoredVis } from '../embeddable/transforms/types';
import { injectControlsReferences } from './controls_references';
import { injectTimeSeriesReferences } from './timeseries_references';
import type { SerializedVis } from '../types';

export function injectVisReferences(savedVis: StoredVis, references: Reference[]): SerializedVis {
  const { searchSource, savedSearchRefName, ...restOfData } = savedVis.data;
  let injectedSearchSource = searchSource;
  if (searchSource) {
    try {
      injectedSearchSource = injectSearchSourceReferences(searchSource, references);
    } catch (e) {
      // Allow missing index pattern error to surface in vis
    }
  }

  const savedSearchRef = savedSearchRefName
    ? references.find((reference) => reference.name === savedSearchRefName)
    : undefined;

  if (savedVis.params) {
    // side effect mutates savedVis.params
    injectControlsReferences(savedVis.type, savedVis.params, references);
    // side effect mutates savedVis.params
    injectTimeSeriesReferences(savedVis.type, savedVis.params, references);
  }

  return {
    ...savedVis,
    data: {
      ...restOfData,
      searchSource: injectedSearchSource,
      ...(savedSearchRef ? { savedSearchId: savedSearchRef.id } : {}),
    },
  };
}
