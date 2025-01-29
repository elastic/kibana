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
  convertPanelMapToPanelsArray,
  convertPanelsArrayToPanelMap,
} from '../../lib/dashboard_panel_converters';
import { DashboardAttributesAndReferences, ParsedDashboardAttributesWithType } from '../../types';
import type { DashboardAttributes } from '../../../server/content_management';
import {
  createExtract,
  createInject,
} from '../../dashboard_container/persistable_state/dashboard_container_references';

export interface InjectExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

function parseDashboardAttributesWithType({
  panels,
}: DashboardAttributes): ParsedDashboardAttributesWithType {
  return {
    type: 'dashboard',
    panels: convertPanelsArrayToPanelMap(panels),
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
  const injectedPanels = convertPanelMapToPanelsArray(injectedState.panels);

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

  const extract = createExtract(deps.embeddablePersistableStateService);
  const { references: extractedReferences, state: extractedState } = extract(parsedAttributes) as {
    references: Reference[];
    state: ParsedDashboardAttributesWithType;
  };
  const extractedPanels = convertPanelMapToPanelsArray(extractedState.panels);

  const newAttributes = {
    ...attributes,
    panels: extractedPanels,
  };

  return {
    references: [...references, ...extractedReferences],
    attributes: newAttributes,
  };
}
