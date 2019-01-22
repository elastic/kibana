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
      throw new Error(`"id" attribute is missing from panel "${i}"`);
    }
    panel.panelRef = `panel_${i}`;
    panelReferences.push({
      name: `panel_${i}`,
      type: panel.type,
      id: panel.id
    });
    delete panel.type;
    delete panel.id;
  });
  return {
    references: [
      ...references,
      ...panelReferences
    ],
    attributes: {
      ...attributes,
      panelsJSON: JSON.stringify(panels)
    }
  };
}

export function injectReferences(savedObject, references) {
  const panels = JSON.parse(savedObject.panelsJSON);
  panels.forEach((panel) => {
    const reference = references.find(reference => reference.name === panel.panelRef);
    if (!reference) {
      throw new Error(`Could not find reference "${panel.panelRef}"`);
    }
    panel.id = reference.id;
    panel.type = reference.type;
    delete panel.panelRef;
  });
  savedObject.panelsJSON = JSON.stringify(panels);
}
