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

import { SavedObjectAttributes, SavedObjectReference } from '../../../core/types';
import {
  extractPanelsReferences,
  injectPanelsReferences,
} from './embeddable/embeddable_references';
import { SavedDashboardPanel730ToLatest } from './types';
import { EmbeddablePersistableStateService } from '../../embeddable/common/types';

export interface ExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

export interface SavedObjectAttributesAndReferences {
  attributes: SavedObjectAttributes;
  references: SavedObjectReference[];
}

export function extractReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: ExtractDeps
): SavedObjectAttributesAndReferences {
  if (typeof attributes.panelsJSON !== 'string') {
    return { attributes, references };
  }
  const panelReferences: SavedObjectReference[] = [];
  let panels: Array<Record<string, string>> = JSON.parse(String(attributes.panelsJSON));

  const extractedReferencesResult = extractPanelsReferences(
    (panels as unknown) as SavedDashboardPanel730ToLatest[],
    deps
  );

  panels = (extractedReferencesResult.map((res) => res.panel) as unknown) as Array<
    Record<string, string>
  >;
  extractedReferencesResult.forEach((res) => {
    panelReferences.push(...res.references);
  });

  // TODO: This extraction should be done by EmbeddablePersistableStateService
  // https://github.com/elastic/kibana/issues/82830
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

export interface InjectDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

export function injectReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: InjectDeps
): SavedObjectAttributes {
  // Skip if panelsJSON is missing otherwise this will cause saved object import to fail when
  // importing objects without panelsJSON. At development time of this, there is no guarantee each saved
  // object has panelsJSON in all previous versions of kibana.
  if (typeof attributes.panelsJSON !== 'string') {
    return attributes;
  }
  let panels = JSON.parse(attributes.panelsJSON);
  // Same here, prevent failing saved object import if ever panels aren't an array.
  if (!Array.isArray(panels)) {
    return attributes;
  }

  // TODO: This injection should be done by EmbeddablePersistableStateService
  // https://github.com/elastic/kibana/issues/82830
  panels.forEach((panel) => {
    if (!panel.panelRefName) {
      return;
    }
    const reference = references.find((ref) => ref.name === panel.panelRefName);
    if (!reference) {
      // Throw an error since "panelRefName" means the reference exists within
      // "references" and in this scenario we have bad data.
      throw new Error(`Could not find reference "${panel.panelRefName}"`);
    }
    panel.id = reference.id;
    panel.type = reference.type;
    delete panel.panelRefName;
  });

  panels = injectPanelsReferences(panels, references, deps);

  return {
    ...attributes,
    panelsJSON: JSON.stringify(panels),
  };
}
