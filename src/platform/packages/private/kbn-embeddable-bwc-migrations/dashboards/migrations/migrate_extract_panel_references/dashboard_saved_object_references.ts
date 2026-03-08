/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { EmbeddableReferenceManagers } from '../../../get_all_embeddable_reference_managers';
import {
  convertPanelMapToSavedPanels,
  convertSavedPanelsToPanelMap,
} from '../dashboard_panel_converters';
import type {
  DashboardAttributesAndReferences,
  ParsedDashboardAttributesWithType,
  RawDashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../types';
import { createExtract, createInject } from './dashboard_container_references';

function parseDashboardAttributesWithType(attributes: {
  panelsJSON?: string;
}): ParsedDashboardAttributesWithType {
  let parsedPanels = [] as SavedDashboardPanel[];
  if (typeof attributes.panelsJSON === 'string') {
    const parsedJSON = JSON.parse(attributes.panelsJSON);
    if (Array.isArray(parsedJSON)) {
      parsedPanels = parsedJSON as SavedDashboardPanel[];
    }
  }

  return {
    type: 'dashboard',
    panels: convertSavedPanelsToPanelMap(parsedPanels),
  } as ParsedDashboardAttributesWithType;
}

export function injectReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  bwcEmbeddableReferenceManagers: EmbeddableReferenceManagers,
  embeddableSetup: EmbeddableSetup // TODO remove this argument when all legacy serverside inject / extract logic is moved into kbn-embeddable-bwc-migrations
): RawDashboardSavedObjectAttributes {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  // inject references back into panels via the Embeddable persistable state service.
  const inject = createInject(bwcEmbeddableReferenceManagers, embeddableSetup);
  const injectedState = inject(parsedAttributes, references) as ParsedDashboardAttributesWithType;
  const injectedPanels = convertPanelMapToSavedPanels(injectedState.panels);

  const newAttributes = {
    ...attributes,
    panelsJSON: JSON.stringify(injectedPanels),
  } as RawDashboardSavedObjectAttributes;

  return newAttributes;
}

export function extractReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  bwcEmbeddableReferenceManagers: EmbeddableReferenceManagers,
  embeddableSetup: EmbeddableSetup // TODO remove this argument when all legacy serverside inject / extract logic is moved into kbn-embeddable-bwc-migrations
): DashboardAttributesAndReferences {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  const panels = parsedAttributes.panels;

  const panelMissingType = Object.entries(panels).find(
    ([panelId, panel]) => panel.type === undefined
  );
  if (panelMissingType) {
    throw new Error(`"type" attribute is missing from panel "${panelMissingType[0]}"`);
  }

  const extract = createExtract(bwcEmbeddableReferenceManagers, embeddableSetup);
  const { references: extractedReferences, state: extractedState } = extract(parsedAttributes) as {
    references: Reference[];
    state: ParsedDashboardAttributesWithType;
  };
  const extractedPanels = convertPanelMapToSavedPanels(extractedState.panels);

  const newAttributes = {
    ...attributes,
    panelsJSON: JSON.stringify(extractedPanels),
  } as RawDashboardSavedObjectAttributes;

  return {
    references: [...references, ...extractedReferences],
    attributes: newAttributes,
  };
}
