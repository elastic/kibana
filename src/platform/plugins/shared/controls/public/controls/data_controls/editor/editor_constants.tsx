/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource, ControlOutputOption } from '@kbn/controls-constants';
import { i18n } from '@kbn/i18n';

export const CONTROL_WIDTH_OPTIONS = [
  {
    id: `small`,
    'data-test-subj': 'control-editor-width-small',
    label: i18n.translate('controls.controlGroup.management.layout.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: `medium`,
    'data-test-subj': 'control-editor-width-medium',
    label: i18n.translate('controls.controlGroup.management.layout.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: `large`,
    'data-test-subj': 'control-editor-width-large',
    label: i18n.translate('controls.controlGroup.management.layout.large', {
      defaultMessage: 'Large',
    }),
  },
];

export const CONTROL_LAYOUT_OPTIONS = [
  {
    id: `oneLine`,
    'data-test-subj': 'control-editor-layout-oneLine',
    label: i18n.translate('controls.controlGroup.management.labelPosition.inline', {
      defaultMessage: 'Inline',
    }),
  },
  {
    id: `twoLine`,
    'data-test-subj': 'control-editor-layout-twoLine',
    label: i18n.translate('controls.controlGroup.management.labelPosition.above', {
      defaultMessage: 'Above',
    }),
  },
];

export const CONTROL_VALUES_SOURCE_OPTIONS = [
  {
    id: ControlValuesSource.DSL,
    'data-test-subj': 'control-editor-input-dsl',
    label: i18n.translate('controls.controlGroup.management.input.dsl', {
      defaultMessage: 'Field',
    }),
  },
  {
    id: ControlValuesSource.ESQL,
    'data-test-subj': 'control-editor-input-esql',
    label: i18n.translate('controls.controlGroup.management.input.esql', {
      defaultMessage: 'Query',
    }),
  },
  {
    id: ControlValuesSource.STATIC,
    'data-test-subj': 'control-editor-input-static',
    label: i18n.translate('controls.controlGroup.management.input.static', {
      defaultMessage: 'Static values',
    }),
  },
];

export const CONTROL_OUTPUT_OPTIONS = [
  {
    id: ControlOutputOption.DSL,
    'data-test-subj': 'control-editor-output-dsl',
    label: i18n.translate('controls.controlGroup.management.output.dsl.label', {
      defaultMessage: 'Field filter',
    }),
    toolTipContent: i18n.translate('controls.controlGroup.management.output.dsl.tooltip', {
      defaultMessage:
        'Select a field. This control will filter data in all dashboard panels where this field matches the chosen value.',
    }),
  },
  {
    id: ControlOutputOption.ESQL,
    'data-test-subj': 'control-editor-output-esql',
    label: i18n.translate('controls.controlGroup.management.output.esql', {
      defaultMessage: 'ES|QL variable',
    }),
    toolTipContent: i18n.translate('controls.controlGroup.management.output.esql.tooltip', {
      defaultMessage:
        'Define a variable. This control will set this variable to the chosen value and output it to any ES|QL panels in this dashboard.',
    }),
  },
];

export const DEFAULT_ESQL_VARIABLE_NAME = '?variable';

export enum EditorComponentStatus {
  COMPLETE,
  INCOMPLETE,
  ERROR,
}

export const getESQLVariableInvalidRegex = () => /[^a-zA-Z0-9_]/g;
export const INITIAL_EMPTY_STATE_ESQL_QUERY = `/** Example
To get the agent field values use: 
FROM logs-* 
|  WHERE @timestamp <=?_tend and @timestamp >?_tstart
| STATS BY agent
*/`;
