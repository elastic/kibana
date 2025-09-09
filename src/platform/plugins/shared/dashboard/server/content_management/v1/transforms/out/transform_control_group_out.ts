/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { ControlsGroupState } from '@kbn/controls-schemas';

import type {
  DashboardSavedObjectAttributes,
  StoredControlGroupInput,
} from '../../../../dashboard_saved_object';
import { transformControlsState } from './transform_controls_state';

export function transformControlGroupOut(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>,
  references: Reference[],
  ignoreParentSettingsJSON?: string
): ControlsGroupState {
  let controls = controlGroupInput.panelsJSON
    ? transformControlsState(controlGroupInput.panelsJSON, references)
    : [];

  /** For legacy controls (<v9.2.0), pass relevant ignoreParentSettings into each individual control panel */
  const legacyControlGroupOptions: StoredControlGroupInput['ignoreParentSettings'] | undefined =
    ignoreParentSettingsJSON ? JSON.parse(ignoreParentSettingsJSON) : undefined;
  const ignoreFilters =
    legacyControlGroupOptions?.ignoreFilters || legacyControlGroupOptions?.ignoreQuery;
  if (ignoreFilters) {
    controls = controls.reduce((prev, control) => {
      return [...prev, { ...control, useGlobalFilters: !ignoreFilters }];
    }, [] as ControlsGroupState['controls']);
  }
  return { controls };
}
