/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectReference,
} from '../../../../../core/public';
import { SavedVisState, VisSavedObject } from '../../types';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
  SerializedSearchSourceFields,
} from '../../../../data/public';

import { extractTimeSeriesReferences, injectTimeSeriesReferences } from './timeseries_references';
import { extractControlsReferences, injectControlsReferences } from './controls_references';

export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: SavedObjectAttributes;
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

export function injectReferences(savedObject: VisSavedObject, references: SavedObjectReference[]) {
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
