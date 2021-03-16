/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import semverSatisfies from 'semver/functions/satisfies';
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

  const isPre730Panel = (panel: Record<string, string>): boolean => {
    return 'version' in panel ? semverSatisfies(panel.version, '<7.3') : true;
  };

  const hasPre730Panel = panels.some(isPre730Panel);

  /**
   * `extractPanelsReferences` only knows how to reliably handle "latest" panels
   * It is possible that `extractReferences` is run on older dashboard SO with older panels,
   * for example, when importing a saved object using saved object UI `extractReferences` is called BEFORE any server side migrations are run.
   *
   * In this case we skip running `extractPanelsReferences` on such object.
   * We also know that there is nothing to extract
   * (First possible entity to be extracted by this mechanism is a dashboard drilldown since 7.11)
   */
  if (!hasPre730Panel) {
    const extractedReferencesResult = extractPanelsReferences(
      // it is ~safe~ to cast to `SavedDashboardPanel730ToLatest` because above we've checked that there are only >=7.3 panels
      (panels as unknown) as SavedDashboardPanel730ToLatest[],
      deps
    );

    panels = (extractedReferencesResult.map((res) => res.panel) as unknown) as Array<
      Record<string, string>
    >;
    extractedReferencesResult.forEach((res) => {
      panelReferences.push(...res.references);
    });
  }

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
