/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common/types';

import {
  convertPanelMapToSavedPanels,
  convertSavedPanelsToPanelMap,
} from '../../lib/dashboard_panel_converters';
import { DashboardAttributesAndReferences, ParsedDashboardAttributesWithType } from '../../types';
import { DashboardAttributes, SavedDashboardPanel } from '../../content_management';

export interface InjectExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

function parseDashboardAttributesWithType(
  attributes: DashboardAttributes
): ParsedDashboardAttributesWithType {
  let panels = [] as SavedDashboardPanel[];
  if (Array.isArray(attributes.panels)) {
    panels = attributes.panels as SavedDashboardPanel[];
  }

  return {
    type: 'dashboard',
    panels: convertSavedPanelsToPanelMap(panels),
  } as ParsedDashboardAttributesWithType;
}

export function injectReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  deps: InjectExtractDeps
): DashboardAttributes {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  // inject references back into panels via the Embeddable persistable state service.
  const injectedState = deps.embeddablePersistableStateService.inject(
    parsedAttributes,
    references
  ) as ParsedDashboardAttributesWithType;
  const injectedPanels = convertPanelMapToSavedPanels(injectedState.panels);

  const newAttributes = {
    ...attributes,
    panels: injectedPanels,
  };

  return newAttributes;
}

export function extractReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  deps: InjectExtractDeps
): DashboardAttributesAndReferences {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  const panels = parsedAttributes.panels;

  const panelMissingType = Object.values(panels).find((panel) => panel.type === undefined);
  if (panelMissingType) {
    throw new Error(
      `"type" attribute is missing from panel "${panelMissingType.explicitInput.id}"`
    );
  }

  const { references: extractedReferences, state: extractedState } =
    deps.embeddablePersistableStateService.extract(parsedAttributes) as {
      references: Reference[];
      state: ParsedDashboardAttributesWithType;
    };
  const extractedPanels = convertPanelMapToSavedPanels(extractedState.panels);

  const newAttributes = {
    ...attributes,
    panels: extractedPanels,
  };

  return {
    references: [...references, ...extractedReferences],
    attributes: newAttributes,
  };
}
