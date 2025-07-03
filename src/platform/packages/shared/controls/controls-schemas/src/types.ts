/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import {
  controlsChainingSchema,
  controlsGroupStateSchema,
  controlsLabelPositionSchema,
  ignoreParentSettingsSchema,
} from './controls_group_state_schema';
import { controlStateSchema, controlWidthSchema } from './control_state_schema';

export type ControlsGroupState = TypeOf<typeof controlsGroupStateSchema>;

export type ControlsLabelPosition = TypeOf<typeof controlsLabelPositionSchema>;
export type ControlsChainingSystem = TypeOf<typeof controlsChainingSchema>;
export type ControlsIgnoreParentSettings = TypeOf<typeof ignoreParentSettingsSchema>;

export type ControlWidth = TypeOf<typeof controlWidthSchema>;
export type ControlState = TypeOf<typeof controlStateSchema>;
