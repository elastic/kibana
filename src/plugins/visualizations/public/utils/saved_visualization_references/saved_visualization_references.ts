/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectAttribute, SavedObjectReference } from '@kbn/core/public';
import { Reference } from '@kbn/content-management-utils';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/public';
import { isObject } from 'lodash';
import { VisualizeSerializedState } from '../../react_embeddable/types';
import { SavedVisState, SerializedVis, VisSavedObject } from '../../types';
import type { SerializableAttributes } from '../../vis_types/vis_type_alias_registry';
import { extractControlsReferences, injectControlsReferences } from './controls_references';
import { extractTimeSeriesReferences, injectTimeSeriesReferences } from './timeseries_references';

const isValidSavedVis = (savedVis: unknown): savedVis is SavedVisState =>
  isObject(savedVis) && 'type' in savedVis && 'params' in savedVis;

export function serializeReferences(savedVis: SerializedVis) {
  const { searchSource, savedSearchId } = savedVis.data;
  const references: Reference[] = [];
  let serializedSearchSource = searchSource;

  if (searchSource) {
    const [extractedSearchSource, searchSourceReferences] = extractSearchSourceReferences(
      searchSource as SerializedSearchSourceFields
    );
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

export function deserializeReferences(
  state: VisualizeSerializedState,
  references: Reference[] = []
) {
  const { savedVis } = state;
  const { searchSource, savedSearchRefName } = savedVis.data;
  const updatedReferences: Reference[] = [...references];
  let deserializedSearchSource = searchSource;
  if (searchSource) {
    deserializedSearchSource = injectSearchSourceReferences(searchSource as any, updatedReferences);
  }
  if (savedSearchRefName) {
    const savedSearchReference = updatedReferences.find(
      (reference) => reference.name === savedSearchRefName
    );
    if (!savedSearchReference) {
      throw new Error(`Could not find saved search reference "${savedSearchRefName}"`);
    }
  }

  if (isValidSavedVis(savedVis)) {
    injectControlsReferences(savedVis.type, savedVis.params, updatedReferences);
    injectTimeSeriesReferences(savedVis.type, savedVis.params, updatedReferences);
  }
  return { references: updatedReferences, deserializedSearchSource };
}

/**
 * @deprecated Use serializeReferences
 */
export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: SerializableAttributes;
  references: SavedObjectReference[];
}) {
  const updatedAttributes = { ...attributes };
  const updatedReferences = [...references];

  if (updatedAttributes.searchSourceFields) {
    const [searchSource, searchSourceReferences] = extractSearchSourceReferences(
      updatedAttributes.searchSourceFields as SerializedSearchSourceFields
    );
    updatedAttributes.searchSourceFields = searchSource as SavedObjectAttribute;
    searchSourceReferences.forEach((r) => updatedReferences.push(r));
  }

  // Extract saved search
  if (updatedAttributes.savedSearchId) {
    updatedReferences.push({
      name: 'search_0',
      type: 'search',
      id: String(updatedAttributes.savedSearchId),
    });
    delete updatedAttributes.savedSearchId;
    updatedAttributes.savedSearchRefName = 'search_0';
  }

  // Extract index patterns from controls
  if (updatedAttributes.visState) {
    const visState = JSON.parse(String(updatedAttributes.visState)) as SavedVisState;

    if (visState.type && visState.params) {
      extractControlsReferences(visState.type, visState.params, updatedReferences);
      extractTimeSeriesReferences(visState.type, visState.params, updatedReferences);
    }

    updatedAttributes.visState = JSON.stringify(visState);
  }

  return {
    references: updatedReferences,
    attributes: updatedAttributes,
  };
}

/**
 * @deprecated Use deserializeReferences
 */
export function injectReferences(savedObject: VisSavedObject, references: Reference[]) {
  if (savedObject.searchSourceFields) {
    savedObject.searchSourceFields = injectSearchSourceReferences(
      savedObject.searchSourceFields as any,
      references
    );
  }
  if (savedObject.savedSearchRefName) {
    const savedSearchReference = references.find(
      (reference) => reference.name === savedObject.savedSearchRefName
    );
    if (!savedSearchReference) {
      throw new Error(`Could not find saved search reference "${savedObject.savedSearchRefName}"`);
    }
    savedObject.savedSearchId = savedSearchReference.id;
    delete savedObject.savedSearchRefName;
  }

  const { type, params } = savedObject.visState ?? {};

  if (type && params) {
    injectControlsReferences(type, params, references);
    injectTimeSeriesReferences(type, params, references);
  }
}
