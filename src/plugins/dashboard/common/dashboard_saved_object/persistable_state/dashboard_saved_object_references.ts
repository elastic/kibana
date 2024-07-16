/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common/types';

import {
  convertPanelMapToSavedPanels,
  convertSavedPanelsToPanelMap,
} from '../../lib/dashboard_panel_converters';
import { DashboardAttributesAndReferences, DashboardAttributesWithType } from '../../types';
import { DashboardAttributes } from '../../content_management';

export interface InjectExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

function getDashboardAttributesWithType(
  attributes: DashboardAttributes
): DashboardAttributesWithType {
  return {
    controlGroupInput: attributes.controlGroupInput,
    type: 'dashboard',
    panels: convertSavedPanelsToPanelMap(attributes.panels),
  } as DashboardAttributesWithType;
}

export function injectReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  deps: InjectExtractDeps
): DashboardAttributes {
  const stateWithType = getDashboardAttributesWithType(attributes);

  // inject references back into panels via the Embeddable persistable state service.
  const injectedState = deps.embeddablePersistableStateService.inject(
    stateWithType,
    references
  ) as DashboardAttributesWithType;
  const injectedPanels = convertPanelMapToSavedPanels(injectedState.panels);

  const newAttributes = {
    ...attributes,
    panels: injectedPanels,
    ...(attributes.controlGroupInput &&
      injectedState.controlGroupInput && {
        controlGroupInput: {
          ...attributes.controlGroupInput,
          panels: injectedState.controlGroupInput.panels,
        },
      }),
  };

  return newAttributes;
}

export function extractReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  deps: InjectExtractDeps
): DashboardAttributesAndReferences {
  const stateWithType = getDashboardAttributesWithType(attributes);

  const panels = stateWithType.panels;

  const panelMissingType = Object.values(panels).find((panel) => panel.type === undefined);
  if (panelMissingType) {
    throw new Error(
      `"type" attribute is missing from panel "${panelMissingType.explicitInput.id}"`
    );
  }

  const { references: extractedReferences, state: extractedState } =
    deps.embeddablePersistableStateService.extract(stateWithType) as {
      references: Reference[];
      state: DashboardAttributesWithType;
    };
  const extractedPanels = convertPanelMapToSavedPanels(extractedState.panels);

  const newAttributes = {
    ...attributes,
    panels: extractedPanels,
    ...(attributes.controlGroupInput &&
      extractedState.controlGroupInput && {
        controlGroupInput: {
          ...attributes.controlGroupInput,
          panels: extractedState.controlGroupInput.panels,
        },
      }),
  };

  return {
    references: [...references, ...extractedReferences],
    attributes: newAttributes,
  };
}
