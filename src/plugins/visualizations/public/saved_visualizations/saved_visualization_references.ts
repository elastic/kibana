/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectReference,
} from '../../../../core/public';
import { VisSavedObject } from '../types';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
  SearchSourceFields,
} from '../../../data/public';

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
      updatedAttributes.searchSourceFields as SearchSourceFields
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
    const visState = JSON.parse(String(updatedAttributes.visState));
    const controls = (visState.params && visState.params.controls) || [];
    controls.forEach((control: Record<string, string>, i: number) => {
      if (!control.indexPattern) {
        return;
      }
      control.indexPatternRefName = `control_${i}_index_pattern`;
      updatedReferences.push({
        name: control.indexPatternRefName,
        type: 'index-pattern',
        id: control.indexPattern,
      });
      delete control.indexPattern;
    });
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
  if (savedObject.visState) {
    const controls = (savedObject.visState.params && savedObject.visState.params.controls) || [];
    controls.forEach((control: Record<string, string>) => {
      if (!control.indexPatternRefName) {
        return;
      }
      const reference = references.find((ref) => ref.name === control.indexPatternRefName);
      if (!reference) {
        throw new Error(`Could not find index pattern reference "${control.indexPatternRefName}"`);
      }
      control.indexPattern = reference.id;
      delete control.indexPatternRefName;
    });
  }
}
