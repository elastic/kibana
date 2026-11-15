/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prettifyError, ZodError } from '@kbn/zod';
import { transformType } from '@kbn/embeddable-plugin/server';
import { discoverSessionApiControlPanelSchema } from '@kbn/as-code-discover-schema';
import {
  getControlOrder,
  isRecord,
  convertControlGroupEntryToApi,
} from '../../../common/session/control_panels';
import type { DiscoverSessionApiControlPanels, DiscoverSessionWarning } from '../schema';

const createDroppedControlPanelsWarning = (
  tabId: string,
  controlGroupJson: string,
  reason: string
): DiscoverSessionWarning => ({
  type: 'dropped_property',
  tab_id: tabId,
  key: 'control_panels',
  value: controlGroupJson,
  message: reason,
});

const getDroppedPanelDetails = (panel: unknown) => {
  if (!isRecord(panel)) {
    return {};
  }

  const { type: panelType, ...panelConfig } = panel;

  if (typeof panelType !== 'string') {
    return { item_config: panel };
  }

  return { item_type: panelType, item_config: panelConfig };
};

const createDroppedPanelWarning = (
  tabId: string,
  panelId: string,
  panel: unknown,
  error: unknown
): DiscoverSessionWarning => {
  const reason = error instanceof Error ? error.message : 'Unknown error';

  return {
    type: 'dropped_item',
    tab_id: tabId,
    key: 'control_panels',
    item_id: panelId,
    ...getDroppedPanelDetails(panel),
    message: error instanceof ZodError ? prettifyError(error) : reason,
  };
};

/*
 * Converts one stored panel to the API shape and validates it.
 * Throws so the caller can drop only that panel and return a warning.
 */
const parseControlPanelEntry = (
  id: string,
  panel: unknown
): DiscoverSessionApiControlPanels[number] => {
  const control = convertControlGroupEntryToApi(id, panel);

  return discoverSessionApiControlPanelSchema.parse({
    ...control,
    type: transformType(control.type),
  });
};

/*
 * Transforms stored control panels for the API response while preserving valid panels.
 * Warns for each panel dropped individually, or for the whole property if its JSON is unreadable.
 */
export const transformControlPanelsOut = (
  controlGroupJson: string | undefined,
  tabId: string
): { panels: DiscoverSessionApiControlPanels | undefined; warnings: DiscoverSessionWarning[] } => {
  if (!controlGroupJson) {
    return { panels: undefined, warnings: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(controlGroupJson);
  } catch {
    return {
      panels: undefined,
      warnings: [createDroppedControlPanelsWarning(tabId, controlGroupJson, 'Invalid JSON.')],
    };
  }

  if (!isRecord(parsed)) {
    return {
      panels: undefined,
      warnings: [
        createDroppedControlPanelsWarning(tabId, controlGroupJson, 'Expected a JSON object.'),
      ],
    };
  }

  const entries = Object.entries(parsed).sort(
    ([, panelA], [, panelB]) => getControlOrder(panelA) - getControlOrder(panelB)
  );

  const panels: DiscoverSessionApiControlPanels = [];
  const warnings: DiscoverSessionWarning[] = [];

  for (const [id, panel] of entries) {
    try {
      panels.push(parseControlPanelEntry(id, panel));
    } catch (error) {
      warnings.push(createDroppedPanelWarning(tabId, id, panel, error));
    }
  }

  return {
    panels: panels.length ? panels : undefined,
    warnings,
  };
};
