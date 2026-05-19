/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import type { Type, TypeOf } from '@kbn/config-schema';
import type { Reference } from '@kbn/content-management-utils';
import type {
  LegacyIgnoreParentSettings,
  LegacyStoredPinnedControlState,
} from '@kbn/controls-schemas';
import { transformType } from '@kbn/embeddable-plugin/server';

import type { DashboardPinnedPanel, DashboardPinnedPanelsState } from '../../../../common';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import { embeddableService } from '../../../kibana_services';
import type { getDashboardStateSchema } from '../../dashboard_state_schemas';
import type { DashboardState, Warnings } from '../../types';

type StoredPinnedPanels = Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];

export function transformPinnedPanelsOut(
  controlGroupInput: DashboardSavedObjectAttributes['controlGroupInput'], // legacy
  pinnedPanels: DashboardSavedObjectAttributes['pinned_panels'],
  containerReferences: Reference[] = [],
  panelsStateSchema: Type<TypeOf<ReturnType<typeof getDashboardStateSchema>>['pinned_panels']>
): { panels: DashboardState['pinned_panels']; warnings: Warnings } {
  if (pinnedPanels) {
    /**
     * >=9.4, pinned panels are stored in the SO under the key `pinned_panels` without any JSON bucketing
     */
    return transformPanel(
      flow(transformPinnedPanelsObjectToArray, transformPinnedPanelProperties)(pinnedPanels.panels),
      containerReferences,
      panelsStateSchema
    );
  } else if (controlGroupInput) {
    /**
     * <9.4, pinned panels were stored in the SO under `controlGroupInput` with the JSON bucket `panelsJSON`
     * This was before pinned panels were transformed to be generic - they **only** stored controls
     */
    const { warnings, panels: controls } = controlGroupInput.panelsJSON
      ? transformPanel(
          flow(
            JSON.parse,
            transformPinnedPanelsObjectToArray,
            transformPinnedPanelProperties
          )(controlGroupInput.panelsJSON),
          containerReferences,
          panelsStateSchema
        )
      : { warnings: [], panels: [] };
    /** For legacy controls (<v9.2.0), pass relevant ignoreParentSettings into each individual control panel */
    const legacyControlGroupOptions: LegacyIgnoreParentSettings | undefined =
      controlGroupInput.ignoreParentSettingsJSON
        ? JSON.parse(controlGroupInput.ignoreParentSettingsJSON)
        : undefined;
    if (legacyControlGroupOptions) {
      // Ignore filters if the legacy control group option is set to ignore filters, or if the legacy chaining system
      // is set to NONE. Including the chaining system check inside this if block is okay to do, because we don't expect
      // a legacy chaining system to be defined without legacyCon4trolGroupOptions also being defined
      const ignoreFilters =
        controlGroupInput.chainingSystem === 'NONE' ||
        legacyControlGroupOptions.ignoreFilters ||
        legacyControlGroupOptions.ignoreQuery;
      controls.map(({ config, ...rest }) => ({
        ...rest,
        config: {
          use_global_filters: !ignoreFilters,
          ignore_validations: legacyControlGroupOptions.ignoreValidations,
          ...config,
        },
      }));
    }
    return { warnings, panels: controls };
  }
  return { warnings: [], panels: [] };
}

/**
 * The SO stores pinned panel as an object with `order` while the Dashboard API expects an array
 */
export function transformPinnedPanelsObjectToArray(
  controls: StoredPinnedPanels
): Array<StoredPinnedPanels[string] & { id: string }> {
  return Object.entries(controls).map(([id, control]) => ({ ...control, id }));
}

/**
 * <9.4 The SO stores the panel config under `explicitInput`
 * >=9.4 the SO stores the panel config under `config`
 */
export function transformPinnedPanelProperties(
  controls: Array<
    (
      | LegacyStoredPinnedControlState[number]
      | Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'][number]
    ) & { id: string }
  >
): DashboardPinnedPanelsState {
  return controls
    .sort(({ order: orderA = 0 }, { order: orderB = 0 }) => orderA - orderB)
    .map(({ id, type, grow, width, ...rest }) => {
      return {
        id,
        type: transformType(type),
        ...(grow !== undefined && { grow }),
        ...(width !== undefined && { width }),
        config: 'explicitInput' in rest ? rest.explicitInput : rest.config,
      } as DashboardPinnedPanel;
    });
}

/**
 * Inject references via the embeddable transforms
 */
function transformPanel(
  panels: DashboardPinnedPanelsState,
  containerReferences: Reference[],
  panelsStateSchema: Type<TypeOf<ReturnType<typeof getDashboardStateSchema>>['pinned_panels']>
): { panels: DashboardPinnedPanelsState; warnings: Warnings } {
  const transformedPanels: DashboardPinnedPanelsState = [];
  const warnings: Warnings = [];

  panels.forEach((panel) => {
    const transforms = embeddableService.getTransforms(panel.type);
    const { config, ...rest } = panel;
    if (transforms?.transformOut) {
      try {
        const transformed = {
          ...rest,
          config: transforms.transformOut(config, [], containerReferences, panel.id),
        } as DashboardPinnedPanel;
        panelsStateSchema.validate([transformed]);
        transformedPanels.push(transformed);
      } catch (e) {
        warnings.push({
          type: 'dropped_panel',
          panel_type: panel.type,
          panel_config: panel.config,
          message: `Unable to transform pinned panel config. Error: ${e.message}`,
        });
      }
    } else {
      transformedPanels.push({ ...rest, config } as DashboardPinnedPanel);
    }
  });
  return { warnings, panels: transformedPanels };
}
