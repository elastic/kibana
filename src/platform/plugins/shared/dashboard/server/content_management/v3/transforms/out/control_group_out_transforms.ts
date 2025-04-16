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
  ControlGroupChainingSystem,
  ControlLabelPosition,
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  type ParentIgnoreSettings,
} from '@kbn/controls-plugin/common';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import type { ControlGroupAttributes } from '../../types';
import { transformControlsState } from './control_state_out_transforms';

export const transformControlGroupOut: (
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) => ControlGroupAttributes = flow(
  transformControlGroupSetDefaults,
  transformControlGroupProperties
);

// TODO We may want to remove setting defaults in the future
function transformControlGroupSetDefaults(
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
) {
  return {
    controlStyle: DEFAULT_CONTROL_LABEL_POSITION,
    chainingSystem: DEFAULT_CONTROL_CHAINING,
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
}: Required<
  NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>
>): ControlGroupAttributes {
  return {
    labelPosition: controlStyle as ControlLabelPosition,
    chainingSystem: chainingSystem as ControlGroupChainingSystem,
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
  ignoreParentSettings: ParentIgnoreSettings
): ParentIgnoreSettings {
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
}: ParentIgnoreSettings): ParentIgnoreSettings {
  return {
    ignoreFilters,
    ignoreQuery,
    ignoreTimerange,
    ignoreValidations,
  };
}
