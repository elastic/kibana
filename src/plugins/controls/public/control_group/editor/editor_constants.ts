/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupStrings } from '../control_group_strings';

export const CONTROL_WIDTH_OPTIONS = [
  {
    id: `auto`,
    'data-test-subj': 'control-editor-width-auto',
    label: ControlGroupStrings.management.controlWidth.getAutoWidthTitle(),
  },
  {
    id: `small`,
    'data-test-subj': 'control-editor-width-small',
    label: ControlGroupStrings.management.controlWidth.getSmallWidthTitle(),
  },
  {
    id: `medium`,
    'data-test-subj': 'control-editor-width-medium',
    label: ControlGroupStrings.management.controlWidth.getMediumWidthTitle(),
  },
  {
    id: `large`,
    'data-test-subj': 'control-editor-width-large',
    label: ControlGroupStrings.management.controlWidth.getLargeWidthTitle(),
  },
];

export const CONTROL_LAYOUT_OPTIONS = [
  {
    id: `oneLine`,
    'data-test-subj': 'control-editor-layout-oneLine',
    label: ControlGroupStrings.management.labelPosition.getInlineTitle(),
  },
  {
    id: `twoLine`,
    'data-test-subj': 'control-editor-layout-twoLine',
    label: ControlGroupStrings.management.labelPosition.getAboveTitle(),
  },
];
