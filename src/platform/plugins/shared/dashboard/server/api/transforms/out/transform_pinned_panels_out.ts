/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import {
  type LegacyIgnoreParentSettings,
  type LegacyStoredPinnedControlState,
} from '@kbn/controls-schemas';
import { transformType } from '@kbn/embeddable-plugin/server';
import { pinnedControlSchema } from '@kbn/controls-schemas/src/controls_group_schema';

import type { DashboardPinnedPanel, DashboardPinnedPanelsState } from '../../../../common';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
<<<<<<< HEAD
import { embeddableService } from '../../../kibana_services';
import type { Warnings } from '../../types';

export type StoredPinnedPanels =
  Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];
=======
import type { DashboardState, Warnings } from '../../types';

import type {
  DashboardPinnedPanelsState as DashboardControlsState,
  DashboardPinnedPanelsState,
} from '../../../../common';
import { embeddableService } from '../../../kibana_services';

type PinnedPanelsState = Required<DashboardState>['pinned_panels'];
type StoredPinnedPanels = Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];
>>>>>>> 9.4

export function transformPinnedPanelsOut(
  controlGroupInput: DashboardSavedObjectAttributes['controlGroupInput'], // legacy
  pinnedPanels: DashboardSavedObjectAttributes['pinned_panels'],
<<<<<<< HEAD
  containerReferences: Reference[] = []
): { panels: DashboardPinnedPanelsState; warnings: Warnings } {
  let warnings: Warnings = [];
  let transformedPanels: DashboardPinnedPanelsState = [];
=======
  containerReferences: Reference[]
): { panels: DashboardState['pinned_panels']; warnings: Warnings } {
>>>>>>> 9.4
  if (pinnedPanels) {
    /**
     * >=9.4, pinned panels are stored in the SO under the key `pinned_panels` without any JSON bucketing
     */
    ({ warnings, panels: transformedPanels } = transformPanels(
      flow(transformPinnedPanelsObjectToArray, transformPinnedPanelProperties)(pinnedPanels.panels),
      containerReferences
    ));
  } else if (controlGroupInput) {
    /**
     * <9.4, pinned panels were stored in the SO under `controlGroupInput` with the JSON bucket `panelsJSON`
     * This was before pinned panels were transformed to be generic - they **only** stored controls
     */
<<<<<<< HEAD
    ({ warnings, panels: transformedPanels } = controlGroupInput.panelsJSON
      ? transformPanels(
=======
    const { warnings, panels: controls } = controlGroupInput.panelsJSON
      ? injectPinnedPanelReferences(
>>>>>>> 9.4
          flow(
            JSON.parse,
            transformPinnedPanelsObjectToArray,
            transformPinnedPanelProperties
          )(controlGroupInput.panelsJSON),
          containerReferences
        )
<<<<<<< HEAD
      : { warnings: [], panels: [] });
=======
      : { warnings: [], panels: [] };
>>>>>>> 9.4
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
      transformedPanels.map(({ config, ...rest }) => ({
        ...rest,
        config: {
          use_global_filters: !ignoreFilters,
          ignore_validations: legacyControlGroupOptions.ignoreValidations,
          ...config,
        },
      }));
    }
<<<<<<< HEAD
  }

  return { warnings, panels: transformedPanels };
=======
    return { warnings, panels: controls };
  }
  return { warnings: [], panels: [] };
>>>>>>> 9.4
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
function transformPanels(
  panels: DashboardPinnedPanelsState,
  containerReferences: Reference[]
): { panels: DashboardPinnedPanelsState; warnings: Warnings } {
<<<<<<< HEAD
  const transformedPanels: DashboardPinnedPanelsState = [];
  const warnings: Warnings = [];

  panels.forEach((panel) => {
    const { transformOut, schema } = embeddableService.getTransforms(panel.type) ?? {};
    // eslint-disable-next-line prefer-const
    let { config, type, ...rest } = panel;
    try {
      if (transformOut) {
        config = transformOut(
          config,
          [],
          containerReferences,
          panel.id
        ) as DashboardPinnedPanel['config'];
=======
  const transformedControls: DashboardControlsState = [];
  const warnings: Warnings = [];

  controls.forEach((control) => {
    const transforms = embeddableService.getTransforms(control.type);
    const { config, ...rest } = control;
    if (transforms?.transformOut) {
      try {
        transformedControls.push({
          ...rest,
          config: transforms.transformOut(config, [], containerReferences, control.id),
        } as DashboardControlsState[number]);
      } catch (e) {
        warnings.push({
          type: 'dropped_panel',
          panel_type: control.type,
          panel_config: control.config,
          message: `Unable to transform pinned panel config. Error: ${e.message}`,
        });
>>>>>>> 9.4
      }
      if (schema) {
        config = schema.validate(config, undefined, undefined, {
          stripUnknownKeys: true,
        }) as DashboardPinnedPanel['config'];
      }
      transformedPanels.push({
        ...pinnedControlSchema.validate(rest),
        config,
        type,
      } as DashboardPinnedPanel);
    } catch (e) {
      warnings.push({
        type: 'dropped_panel',
        panel_type: panel.type,
        panel_config: panel.config,
        message: `Unable to transform pinned panel config. Error: ${e.message}`,
      });
    }
  });
<<<<<<< HEAD
  return { warnings, panels: transformedPanels };
=======
  return { warnings, panels: transformedControls };
>>>>>>> 9.4
}
