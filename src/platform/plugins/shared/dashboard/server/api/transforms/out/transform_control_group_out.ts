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
  DashboardSavedObjectAttributes,
  StoredControlGroupInput,
} from '../../../dashboard_saved_object';
import { transformControlsState } from './transform_controls_state';
import type { DashboardState } from '../../types';

export function transformControlGroupOut(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>,
  containerReferences: Reference[],
  ignoreParentSettingsJSON?: string
): DashboardState['pinned_panels'] {
  const controls = controlGroupInput.panelsJSON
    ? transformControlsState(controlGroupInput.panelsJSON, containerReferences)
    : [];

  /** For legacy controls (<v9.2.0), pass relevant ignoreParentSettings into each individual control panel */
  const legacyControlGroupOptions: StoredControlGroupInput['ignoreParentSettings'] | undefined =
    ignoreParentSettingsJSON ? JSON.parse(ignoreParentSettingsJSON) : undefined;
  if (legacyControlGroupOptions) {
    // Ignore filters if the legacy control group option is set to ignore filters, or if the legacy chaining system
    // is set to NONE. Including the chaining system check inside this if block is okay to do, because we don't expect
    // a legacy chaining system to be defined without legacyControlGroupOptions also being defined
    const ignoreFilters =
      controlGroupInput.chainingSystem === 'NONE' ||
      legacyControlGroupOptions.ignoreFilters ||
      legacyControlGroupOptions.ignoreQuery;
    controls.map(({ config, ...rest }) => ({
      ...rest,
      config: {
        useGlobalFilters: !ignoreFilters,
        ignoreValidations: legacyControlGroupOptions.ignoreValidations,
        ...config,
      },
    }));
  }

  return controls;
}
