/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaults, flow, pick } from 'lodash';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  type ParentIgnoreSettings,
} from '@kbn/controls-plugin/common';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import type { ControlGroupAttributes } from '../../types';
import { transformControlsState } from './control_state';

export const transformControlGroupOut: (
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) => ControlGroupAttributes = flow(
  transformControlGroupSetDefaults,
  transformIgnoreParentSettings,
  transformShowApplySelections,
  transformLabelPosition,
  transformPanelsJSON
);

// TODO We may want to remove setting defaults in the future
function transformControlGroupSetDefaults(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  return defaults(controlGroupInput, {
    controlStyle: DEFAULT_CONTROL_LABEL_POSITION,
    chainingSystem: DEFAULT_CONTROL_CHAINING,
    showApplySelections: !DEFAULT_AUTO_APPLY_SELECTIONS,
  });
}

function transformIgnoreParentSettings(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  const { ignoreParentSettingsJSON, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    ignoreParentSettings: ignoreParentSettingsJSON
      ? flow(
          JSON.parse,
          transformIgnoreParentSettingsSetDefaults,
          pickSupportedIgnoreParentSettings
        )(ignoreParentSettingsJSON)
      : DEFAULT_IGNORE_PARENT_SETTINGS,
  };
}

// TODO We may want to remove setting defaults in the future
function transformIgnoreParentSettingsSetDefaults(
  ignoreParentSettings: ParentIgnoreSettings
): ParentIgnoreSettings {
  return defaults(ignoreParentSettings, DEFAULT_IGNORE_PARENT_SETTINGS);
}

function pickSupportedIgnoreParentSettings(
  ignoreParentSettings: ParentIgnoreSettings
): ParentIgnoreSettings {
  return pick(ignoreParentSettings, [
    'ignoreFilters',
    'ignoreQuery',
    'ignoreTimerange',
    'ignoreValidations',
  ]);
}

function transformShowApplySelections(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  const { showApplySelections, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    autoApplySelections: !showApplySelections,
  };
}

function transformLabelPosition(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  const { controlStyle, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    labelPosition: controlStyle,
  };
}

function transformPanelsJSON(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  const { panelsJSON, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    controls: panelsJSON ? transformControlsState(panelsJSON) : [],
  };
}
