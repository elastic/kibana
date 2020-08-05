/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
