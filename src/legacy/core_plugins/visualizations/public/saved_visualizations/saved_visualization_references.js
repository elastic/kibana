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

export function extractReferences({ attributes, references = [] }) {
  const updatedAttributes = { ...attributes };
  const updatedReferences = [...references];

  // Extract saved search
  if (updatedAttributes.savedSearchId) {
    updatedReferences.push({
      name: 'search_0',
      type: 'search',
      id: updatedAttributes.savedSearchId,
    });
    delete updatedAttributes.savedSearchId;
    updatedAttributes.savedSearchRefName = 'search_0';
  }

  // Extract index patterns from controls
  if (updatedAttributes.visState) {
    const visState = JSON.parse(updatedAttributes.visState);
    const controls = (visState.params && visState.params.controls) || [];
    controls.forEach((control, i) => {
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

export function injectReferences(savedObject, references) {
  if (savedObject.savedSearchRefName) {
    const savedSearchReference = references.find(
      reference => reference.name === savedObject.savedSearchRefName
    );
    if (!savedSearchReference) {
      throw new Error(`Could not find saved search reference "${savedObject.savedSearchRefName}"`);
    }
    savedObject.savedSearchId = savedSearchReference.id;
    delete savedObject.savedSearchRefName;
  }
  if (savedObject.visState) {
    const controls = (savedObject.visState.params && savedObject.visState.params.controls) || [];
    controls.forEach(control => {
      if (!control.indexPatternRefName) {
        return;
      }
      const reference = references.find(
        reference => reference.name === control.indexPatternRefName
      );
      if (!reference) {
        throw new Error(`Could not find index pattern reference "${control.indexPatternRefName}"`);
      }
      control.indexPattern = reference.id;
      delete control.indexPatternRefName;
    });
  }
}
