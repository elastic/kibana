/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { transformType } from '@kbn/embeddable-plugin/server';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import type { DiscoverSessionControlPanels, DiscoverSessionWarning } from '../schema';
import { discoverSessionControlPanelSchema, discoverSessionControlPanelsSchema } from '../schema';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  isObject(value) && !Array.isArray(value);

const getPanelOrder = (panel: unknown): number =>
  isRecord(panel) && typeof panel.order === 'number' ? panel.order : 0;

const createDroppedControlPanelsWarning = (
  tabId: string,
  reason: string
): DiscoverSessionWarning => ({
  type: 'dropped_property',
  tab_id: tabId,
  key: 'control_panels',
  message: `Unable to transform control panels. Error: ${reason}`,
});

const createDroppedPanelWarning = (
  tabId: string,
  panelId: string,
  error: unknown
): DiscoverSessionWarning => ({
  type: 'dropped_panel',
  tab_id: tabId,
  panel_id: panelId,
  message: `Unable to transform control panel [${panelId}]. Error: ${
    error instanceof Error ? error.message : 'Unknown error'
  }`,
});

/*
 * Converts one stored panel to the API shape and validates it.
 * Throws so the caller can drop only that panel and return a warning.
 */
const parseControlPanelEntry = (
  id: string,
  panel: unknown
): DiscoverSessionControlPanels[number] => {
  if (!isRecord(panel)) {
    throw new Error('controlGroupJson panels must be JSON objects');
  }

  if (typeof panel.type !== 'string') {
    throw new Error('controlGroupJson panels must have a type');
  }

  const { order, width, grow, type, ...config } = panel;
  // `convertCamelCasedKeysToSnakeCase` is idempotent, so it is safe to run on non-legacy config too.
  const snakeCasedConfig = convertCamelCasedKeysToSnakeCase(config);

  return discoverSessionControlPanelSchema.parse({
    id,
    type: transformType(type),
    ...(width !== undefined && { width }),
    ...(grow !== undefined && { grow }),
    config: snakeCasedConfig,
  });
};

/*
 * Transforms stored control panels for the API response while preserving valid panels.
 * Warns for each panel dropped individually, or for the whole property if its JSON is unreadable.
 */
export const transformControlPanelsOut = (
  controlGroupJson: string | undefined,
  tabId: string
): { panels: DiscoverSessionControlPanels | undefined; warnings: DiscoverSessionWarning[] } => {
  if (!controlGroupJson) {
    return { panels: undefined, warnings: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(controlGroupJson);
  } catch {
    return {
      panels: undefined,
      warnings: [createDroppedControlPanelsWarning(tabId, 'controlGroupJson is not valid JSON')],
    };
  }

  if (!isRecord(parsed)) {
    return {
      panels: undefined,
      warnings: [
        createDroppedControlPanelsWarning(tabId, 'controlGroupJson must be a JSON object'),
      ],
    };
  }

  const entries = Object.entries(parsed).sort(
    ([, panelA], [, panelB]) => getPanelOrder(panelA) - getPanelOrder(panelB)
  );

  const panels: DiscoverSessionControlPanels = [];
  const warnings: DiscoverSessionWarning[] = [];

  for (const [id, panel] of entries) {
    try {
      panels.push(parseControlPanelEntry(id, panel));
    } catch (error) {
      warnings.push(createDroppedPanelWarning(tabId, id, error));
    }
  }

  return {
    panels: panels.length ? discoverSessionControlPanelsSchema.parse(panels) : undefined,
    warnings,
  };
};

/*
 * Converts API control panels back to Discover's stored JSON shape.
 * Omits the property when there are no panels to store.
 */
export const transformControlPanelsIn = (
  controlPanels: DiscoverSessionControlPanels | undefined
): string | undefined => {
  if (!controlPanels?.length) {
    return undefined;
  }

  const panels = Object.fromEntries(
    controlPanels.map((panel, order) => {
      const { id, type, width, grow, config } = panel;

      return [
        id,
        {
          order,
          type,
          ...(width !== undefined && { width }),
          ...(grow !== undefined && { grow }),
          ...config,
        },
      ];
    })
  );

  return JSON.stringify(panels);
};
