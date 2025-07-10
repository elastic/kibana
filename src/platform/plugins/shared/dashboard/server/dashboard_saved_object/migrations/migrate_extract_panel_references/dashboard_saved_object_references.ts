/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import {
  EmbeddablePersistableStateService,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/common';

import {
  convertPanelMapToSavedPanels,
  convertSavedPanelsToPanelMap,
} from '../dashboard_panel_converters';
import { DashboardAttributes } from '../../schema/v1';
import { createExtract, createInject } from './dashboard_container_references';
import { DashboardPanelMap810 } from '../types';
import { SavedDashboardPanel } from '../../schema/v2';

export interface InjectExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

/**
 * A partially parsed version of the Dashboard Attributes used for inject and extract logic for both the Dashboard Container and the Dashboard Saved Object.
 */
export type ParsedDashboardAttributesWithType = EmbeddableStateWithType & {
  panels: DashboardPanelMap810;
  type: 'dashboard';
};

export interface DashboardAttributesAndReferences {
  attributes: DashboardAttributes;
  references: Reference[];
}

function parseDashboardAttributesWithType(
  attributes: DashboardAttributes
): ParsedDashboardAttributesWithType {
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
  deps: InjectExtractDeps
): DashboardAttributes {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  // inject references back into panels via the Embeddable persistable state service.
  const inject = createInject(deps.embeddablePersistableStateService);
  const injectedState = inject(parsedAttributes, references) as ParsedDashboardAttributesWithType;
  const injectedPanels = convertPanelMapToSavedPanels(injectedState.panels);

  const newAttributes = {
    ...attributes,
    panelsJSON: JSON.stringify(injectedPanels),
  } as DashboardAttributes;

  return newAttributes;
}

export function extractReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  deps: InjectExtractDeps
): DashboardAttributesAndReferences {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  const panels = parsedAttributes.panels;

  const panelMissingType = Object.entries(panels).find(
    ([panelId, panel]) => panel.type === undefined
  );
  if (panelMissingType) {
    throw new Error(`"type" attribute is missing from panel "${panelMissingType[0]}"`);
  }

  const extract = createExtract(deps.embeddablePersistableStateService);
  const { references: extractedReferences, state: extractedState } = extract(parsedAttributes) as {
    references: Reference[];
    state: ParsedDashboardAttributesWithType;
  };
  const extractedPanels = convertPanelMapToSavedPanels(extractedState.panels);

  const newAttributes = {
    ...attributes,
    panelsJSON: JSON.stringify(extractedPanels),
  } as DashboardAttributes;

  return {
    references: [...references, ...extractedReferences],
    attributes: newAttributes,
  };
}
