/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { ESQLControlState, EsqlControlType } from '@kbn/esql-types';

export const mockControlState: ControlPanelsState<ESQLControlState> = {
  panel1: {
    type: 'esqlControl',
    availableOptions: ['bar', 'baz'],
    variableType: 'values' as ESQLControlState['variableType'],
    variableName: 'foo',
    title: 'Panel 1',
    selectedOptions: ['bar'],
    esqlQuery: '',
    controlType: 'STATIC_VALUES' as EsqlControlType,
    order: 0,
  },
};
