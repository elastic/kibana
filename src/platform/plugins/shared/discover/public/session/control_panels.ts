/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import type { DiscoverSessionClient } from './api_client';

type ApiResponse = Awaited<ReturnType<DiscoverSessionClient['get']>>;
type ApiControlPanels = NonNullable<ApiResponse['data']['tabs'][number]['control_panels']>;
type RuntimeControlPanel = ControlPanelsState<OptionsListESQLControlState>[string];

// TODO: Move this mapping to a shared Discover module when the client and server use common
// session types. Keep both implementations aligned until then.
/** Converts API controls into the JSON shape used by Discover runtime state. */
export const toControlGroupJson = (
  controlPanels: ApiControlPanels | undefined
): string | undefined => {
  if (!controlPanels?.length) {
    return undefined;
  }

  return JSON.stringify(
    Object.fromEntries(
      controlPanels.map(({ id, type, width, grow, config }, order) => [
        id,
        { order, type, width, grow, ...config },
      ])
    )
  );
};

/** Converts Discover runtime controls into the API array shape. */
export const toApiControlPanels = (
  controlGroupJson: string | undefined
): ApiControlPanels | undefined => {
  if (!controlGroupJson) {
    return undefined;
  }

  const controlGroup = parseRuntimeControlGroup(controlGroupJson);
  const panels = Object.entries(controlGroup)
    .map(([id, panel]) => [id, parseControlPanel(id, panel)] as const)
    .sort(([, panelA], [, panelB]) => panelA.order - panelB.order)
    .map(([id, panel]): ApiControlPanels[number] => {
      const { order: _order, type, id: _panelId, width, grow, ...config } = panel;
      const snakeCasedConfig = convertCamelCasedKeysToSnakeCase(config);

      if (type !== 'esqlControl' && type !== ESQL_CONTROL) {
        throw new Error(`Unsupported Discover control panel type [${type}]`);
      }

      return {
        id,
        type: ESQL_CONTROL,
        width,
        grow,
        config: snakeCasedConfig,
      };
    });

  return panels.length > 0 ? panels : undefined;
};

/** Parses runtime control state and fails instead of silently omitting invalid controls. */
const parseRuntimeControlGroup = (controlGroupJson: string): Record<string, unknown> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(controlGroupJson);
  } catch {
    throw new Error('Unable to save the Discover session: control panel state is not valid JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Unable to save the Discover session: control panel state must be an object');
  }

  return parsed;
};

/** Validates the panel fields needed before converting the rest through the API schema. */
const parseControlPanel = (id: string, panel: unknown): RuntimeControlPanel => {
  if (!isRecord(panel)) {
    throw new Error(`Unable to save the Discover session: control panel [${id}] must be an object`);
  }

  if (typeof panel.order !== 'number' || typeof panel.type !== 'string') {
    throw new Error(
      `Unable to save the Discover session: control panel [${id}] has invalid runtime state`
    );
  }

  return panel as RuntimeControlPanel;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
