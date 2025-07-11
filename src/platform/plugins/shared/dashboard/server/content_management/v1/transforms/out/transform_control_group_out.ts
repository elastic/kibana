/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROLS_CHAINING,
  DEFAULT_CONTROLS_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
} from '@kbn/controls-constants';
import type {
  ControlsChainingSystem,
  ControlsGroupState,
  ControlsLabelPosition,
  ControlsIgnoreParentSettings,
} from '@kbn/controls-schemas';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { transformControlsState } from './transform_controls_state';

export const transformControlGroupOut: (
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) => ControlsGroupState = flow(transformControlGroupSetDefaults, transformControlGroupProperties);

// TODO We may want to remove setting defaults in the future
function transformControlGroupSetDefaults(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  return {
    controlStyle: DEFAULT_CONTROLS_LABEL_POSITION,
    chainingSystem: DEFAULT_CONTROLS_CHAINING,
    showApplySelections: !DEFAULT_AUTO_APPLY_SELECTIONS,
    ...controlGroupInput,
  };
}

function transformControlGroupProperties({
  controlStyle,
  chainingSystem,
  showApplySelections,
  ignoreParentSettingsJSON,
  panelsJSON,
}: Required<NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>>): ControlsGroupState {
  return {
    labelPosition: controlStyle as ControlsLabelPosition,
    chainingSystem: chainingSystem as ControlsChainingSystem,
    autoApplySelections: !showApplySelections,
    ignoreParentSettings: ignoreParentSettingsJSON
      ? flow(
          JSON.parse,
          transformIgnoreParentSettingsSetDefaults,
          transformIgnoreParentSettingsProperties
        )(ignoreParentSettingsJSON)
      : DEFAULT_IGNORE_PARENT_SETTINGS,
    controls: panelsJSON ? transformControlsState(panelsJSON) : [],
  };
}

// TODO We may want to remove setting defaults in the future
function transformIgnoreParentSettingsSetDefaults(
  ignoreParentSettings: ControlsIgnoreParentSettings
): ControlsIgnoreParentSettings {
  return {
    ...DEFAULT_IGNORE_PARENT_SETTINGS,
    ...ignoreParentSettings,
  };
}

/**
 * Explicitly extract and provide the expected properties ignoring any unsupported
 * properties that may be in the saved object.
 */
function transformIgnoreParentSettingsProperties({
  ignoreFilters,
  ignoreQuery,
  ignoreTimerange,
  ignoreValidations,
}: ControlsIgnoreParentSettings): ControlsIgnoreParentSettings {
  return {
    ignoreFilters,
    ignoreQuery,
    ignoreTimerange,
    ignoreValidations,
  };
}
