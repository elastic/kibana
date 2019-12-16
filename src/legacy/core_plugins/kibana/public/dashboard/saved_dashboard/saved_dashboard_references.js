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
  const panelReferences = [];
  const panels = JSON.parse(attributes.panelsJSON);
  panels.forEach((panel, i) => {
    if (!panel.type) {
      throw new Error(`"type" attribute is missing from panel "${i}"`);
    }
    if (!panel.id) {
      // Embeddables are not required to be backed off a saved object.
      return;
    }
    panel.panelRefName = `panel_${i}`;
    panelReferences.push({
      name: `panel_${i}`,
      type: panel.type,
      id: panel.id,
    });
    delete panel.type;
    delete panel.id;
  });
  return {
    references: [...references, ...panelReferences],
    attributes: {
      ...attributes,
      panelsJSON: JSON.stringify(panels),
    },
  };
}

export function injectReferences(savedObject, references) {
  // Skip if panelsJSON is missing otherwise this will cause saved object import to fail when
  // importing objects without panelsJSON. At development time of this, there is no guarantee each saved
  // object has panelsJSON in all previous versions of kibana.
  if (typeof savedObject.panelsJSON !== 'string') {
    return;
  }
  const panels = JSON.parse(savedObject.panelsJSON);
  // Same here, prevent failing saved object import if ever panels aren't an array.
  if (!Array.isArray(panels)) {
    return;
  }
  panels.forEach(panel => {
    if (!panel.panelRefName) {
      return;
    }
    const reference = references.find(reference => reference.name === panel.panelRefName);
    if (!reference) {
      // Throw an error since "panelRefName" means the reference exists within
      // "references" and in this scenario we have bad data.
      throw new Error(`Could not find reference "${panel.panelRefName}"`);
    }
    panel.id = reference.id;
    panel.type = reference.type;
    delete panel.panelRefName;
  });
  savedObject.panelsJSON = JSON.stringify(panels);
}
