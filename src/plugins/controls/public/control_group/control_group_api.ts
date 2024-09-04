/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HasType } from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing';
import {
  AddOptionsListControlProps,
  AddRangeSliderControlProps,
} from './external_api/control_group_input_builder';

export type ControlGroupApi = HasType<'control_group'> & {
  addOptionsListControl: (controlProps: AddOptionsListControlProps) => void;
  addRangeSliderControl: (controlProps: AddRangeSliderControlProps) => void;
  setAutoApplySelections: (autoApplySelections: boolean) => void;
  setApplyGlobalTime: (applyGlobalTime: boolean) => void;
};

export const isControlGroupApi = (api: unknown): api is ControlGroupApi => {
  return Boolean(
    api &&
      apiIsOfType(api, 'control_group') &&
      typeof (api as ControlGroupApi).addOptionsListControl === 'function' &&
      typeof (api as ControlGroupApi).addRangeSliderControl === 'function' &&
      typeof (api as ControlGroupApi).setAutoApplySelections === 'function' &&
      typeof (api as ControlGroupApi).setApplyGlobalTime === 'function'
  );
};
