/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { LegacyIgnoreParentSettings } from '@kbn/controls-schemas';

import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import {
  transformLegacyControlsState,
  transformPinnedPanelsState,
} from './transform_controls_state';
import type { DashboardState } from '../../types';

export function transformControlGroupOut(
  controlGroupInput: DashboardSavedObjectAttributes['controlGroupInput'],
  pinnedPanels: DashboardSavedObjectAttributes['pinned_panels'],
  containerReferences: Reference[]
): DashboardState['pinned_panels'] {
  if (pinnedPanels) {
    /**
     * >=9.4, pinned panels are stored under the key `pinned_panels` without any JSON bucketing
     */
    return transformPinnedPanelsState(pinnedPanels.panels, containerReferences);
  } else if (controlGroupInput) {
    /**
     * <9.4, pinned panels were stored in the SO under `controlGroupInput` with the JSON bucket `panelsJSON`
     */
    const controls = controlGroupInput.panelsJSON
      ? transformLegacyControlsState(controlGroupInput.panelsJSON, containerReferences)
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
