/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlWidth } from '../types';
import { ControlGroupStrings } from './control_group_strings';

export const CONTROL_GROUP_TYPE = 'control_group';

export const DEFAULT_CONTROL_WIDTH: ControlWidth = 'auto';

export const CONTROL_WIDTH_OPTIONS = [
  {
    id: `auto`,
    label: ControlGroupStrings.management.controlWidth.getAutoWidthTitle(),
  },
  {
    id: `small`,
    label: ControlGroupStrings.management.controlWidth.getSmallWidthTitle(),
  },
  {
    id: `medium`,
    label: ControlGroupStrings.management.controlWidth.getMediumWidthTitle(),
  },
  {
    id: `large`,
    label: ControlGroupStrings.management.controlWidth.getLargeWidthTitle(),
  },
];

export const CONTROL_LAYOUT_OPTIONS = [
  {
    id: `oneLine`,
    label: ControlGroupStrings.management.controlStyle.getSingleLineTitle(),
  },
  {
    id: `twoLine`,
    label: ControlGroupStrings.management.controlStyle.getTwoLineTitle(),
  },
];
