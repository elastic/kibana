/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type {
  ControlsGroupState as PinnedPanelsState,
  LegacyIgnoreParentSettings,
} from '@kbn/controls-schemas';
import { flow } from 'lodash';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { DashboardState } from '../../types';

import type {
  DashboardPinnedPanelsState as DashboardControlsState,
  DashboardPinnedPanelsState,
} from '../../../../common';
import { embeddableService, logger } from '../../../kibana_services';

type StoredPinnedPanels = Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];

export function transformPinnedPanelsOut(
  controlGroupInput: DashboardSavedObjectAttributes['controlGroupInput'],
  pinnedPanels: DashboardSavedObjectAttributes['pinned_panels'],
  containerReferences: Reference[]
): DashboardState['pinned_panels'] {
  if (pinnedPanels) {
    /**
     * >=9.4, pinned panels are stored in the SO under the key `pinned_panels` without any JSON bucketing
     */
    return injectPinnedPanelReferences(
      flow(
        transformPinnedPanelsObjectToArray,
        transformLegacyPinnedPanelProperties
      )(pinnedPanels.panels),
      containerReferences
    );
  } else if (controlGroupInput) {
    /**
     * <9.4, pinned panels were stored in the SO under `controlGroupInput` with the JSON bucket `panelsJSON`
     * This was before pinned panels were transformed to be generic - they **only** stored controls
     */
    const controls = controlGroupInput.panelsJSON
      ? injectPinnedPanelReferences(
          flow(
            JSON.parse,
            transformPinnedPanelsObjectToArray,
            transformLegacyPinnedPanelProperties
          )(controlGroupInput.panelsJSON),
          containerReferences
        )
      : [];
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
    return controls;
  }
  return;
}

/**
 * The SO stores pinned panel as an object with `order` while the Dashboard API expects an array
 */
function transformPinnedPanelsObjectToArray(
  controls: StoredPinnedPanels
): Array<StoredPinnedPanels[string] & { id: string }> {
  return Object.entries(controls).map(([id, control]) => ({ ...control, id }));
}

/**
 * The SO stores the panel config under `explicitInput`
 */
function transformLegacyPinnedPanelProperties(
  controls: Array<StoredPinnedPanels[string] & { id: string }>
): PinnedPanelsState {
  return controls
    .sort(({ order: orderA = 0 }, { order: orderB = 0 }) => orderA - orderB)
    .map(({ explicitInput, id, type, grow, width }) => {
      return {
        uid: id,
        type,
        ...(grow !== undefined && { grow }),
        ...(width !== undefined && { width }),
        config: explicitInput,
      } as PinnedPanelsState[number];
    });
}

/**
 * Inject references via the embeddable transforms
 */
function injectPinnedPanelReferences(
  controls: PinnedPanelsState,
  containerReferences: Reference[]
): DashboardPinnedPanelsState {
  const transformedControls: DashboardControlsState = [];
  controls.forEach((control) => {
    const transforms = embeddableService.getTransforms(control.type);
    const { config, ...rest } = control;
    if (transforms?.transformOut) {
      try {
        transformedControls.push({
          ...rest,
          config: transforms.transformOut(config, [], containerReferences, control.uid),
        } as DashboardControlsState[number]);
      } catch (transformOutError) {
        // do not prevent read on transformOutError
        logger.warn(
          `Unable to transform "${control.type}" embeddable state on read. Error: ${transformOutError.message}`
        );
      }
    } else {
      transformedControls.push({ ...rest, config } as DashboardControlsState[number]);
    }
  });
  return transformedControls;
}
