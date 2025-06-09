/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import { TypeOf, schema } from '@kbn/config-schema';
import {
  ControlGroupChainingSystem,
  ControlLabelPosition,
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  type ParentIgnoreSettings,
} from '@kbn/controls-plugin/common';

import type { ControlGroupAttributes } from '../../types';
import { transformControlsState } from './control_state_out_transforms';

/**
 * Transform an unknown `controlGroupInput` from the dashboard SO to a valid `controlGroupInput` for the CM schema
 */
const controlGroupSavedObjectSchema = schema.object({
  panelsJSON: schema.string(),
  controlStyle: schema.maybe(schema.string()),
  chainingSystem: schema.maybe(schema.string()),
  ignoreParentSettingsJSON: schema.maybe(schema.string()),
  showApplySelections: schema.maybe(schema.boolean()),
});
type ControlGroupSavedObject = TypeOf<typeof controlGroupSavedObjectSchema>;

export const isControlGroupSavedObject = (
  controlGroupInput: unknown
): controlGroupInput is ControlGroupSavedObject => {
  try {
    return Boolean(controlGroupSavedObjectSchema.validate(controlGroupInput));
  } catch {
    return false;
  }
};

export const transformControlGroupOut: (controlGroupInput: unknown) => {
  controlGroupInput?: ControlGroupAttributes;
} = (controlGroupInput: unknown) => {
  if (!isControlGroupSavedObject(controlGroupInput)) return {};
  return {
    controlGroupInput: flow(
      transformControlGroupSetDefaults,
      transformControlGroupProperties
    )(controlGroupInput),
  };
};

// TODO We may want to remove setting defaults in the future
function transformControlGroupSetDefaults(controlGroupInput: ControlGroupSavedObject) {
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
}: ControlGroupSavedObject): ControlGroupAttributes {
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
