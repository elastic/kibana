/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import {
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  DEFAULT_PINNED_CONTROL_STATE,
} from '@kbn/controls-constants';
import { EsqlControlType } from '@kbn/esql-types';

export const mockControlState: ControlPanelsState<OptionsListESQLControlState> = {
  panel1: {
    ...DEFAULT_PINNED_CONTROL_STATE,
    ...DEFAULT_ESQL_OPTIONS_LIST_STATE,
    type: 'esqlControl',
    available_options: ['bar', 'baz'],
    variable_type: 'values' as OptionsListESQLControlState['variable_type'],
    variable_name: 'foo',
    title: 'Panel 1',
    selected_options: ['bar'],
    control_type: EsqlControlType.STATIC_VALUES,
    order: 0,
  },
};
