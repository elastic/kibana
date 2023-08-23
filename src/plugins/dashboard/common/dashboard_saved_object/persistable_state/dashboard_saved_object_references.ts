/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import semverGt from 'semver/functions/gt';

import { Reference } from '@kbn/content-management-utils';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common/types';
import { rawControlGroupAttributesToControlGroupInput } from '@kbn/controls-plugin/common';

import {
  convertPanelMapToSavedPanels,
  convertSavedPanelsToPanelMap,
} from '../../lib/dashboard_panel_converters';
import { DashboardAttributesAndReferences, ParsedDashboardAttributesWithType } from '../../types';
import { DashboardAttributes, SavedDashboardPanel } from '../../content_management';

export interface InjectExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

const isPre730Panel = (panel: Record<string, string>): boolean => {
  return 'version' in panel && panel.version ? semverGt('7.3.0', panel.version) : true;
};

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
    controlGroupInput:
      attributes.controlGroupInput &&
      rawControlGroupAttributesToControlGroupInput(attributes.controlGroupInput),
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
  const injectedState = deps.embeddablePersistableStateService.inject(
    parsedAttributes,
    references
  ) as ParsedDashboardAttributesWithType;
  const injectedPanels = convertPanelMapToSavedPanels(injectedState.panels);

  const newAttributes = {
    ...attributes,
    panelsJSON: JSON.stringify(injectedPanels),
  } as DashboardAttributes;

  if (attributes.controlGroupInput && injectedState.controlGroupInput) {
    newAttributes.controlGroupInput = {
      ...attributes.controlGroupInput,
      panelsJSON: JSON.stringify(injectedState.controlGroupInput.panels),
    };
  }

  return newAttributes;
}

export function extractReferences(
  { attributes, references = [] }: DashboardAttributesAndReferences,
  deps: InjectExtractDeps
): DashboardAttributesAndReferences {
  const parsedAttributes = parseDashboardAttributesWithType(attributes);

  const panels = parsedAttributes.panels;

  if ((Object.values(panels) as unknown as Array<Record<string, string>>).some(isPre730Panel)) {
    return pre730ExtractReferences({ attributes, references });
  }

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
    panelsJSON: JSON.stringify(extractedPanels),
  } as DashboardAttributes;

  if (attributes.controlGroupInput && extractedState.controlGroupInput) {
    newAttributes.controlGroupInput = {
      ...attributes.controlGroupInput,
      panelsJSON: JSON.stringify(extractedState.controlGroupInput.panels),
    };
  }

  return {
    references: [...references, ...extractedReferences],
    attributes: newAttributes,
  };
}

function pre730ExtractReferences({
  attributes,
  references = [],
}: DashboardAttributesAndReferences): DashboardAttributesAndReferences {
  if (typeof attributes.panelsJSON !== 'string') {
    return { attributes, references };
  }
  const panelReferences: Reference[] = [];
  const panels: Array<Record<string, string>> = JSON.parse(String(attributes.panelsJSON));

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
