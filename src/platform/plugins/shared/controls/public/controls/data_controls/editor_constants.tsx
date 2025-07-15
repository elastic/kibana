/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

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

export const CONTROL_INPUT_OPTIONS = [
  {
    id: 'dsl',
    'data-test-subj': 'control-editor-input-dsl',
    label: i18n.translate('controls.controlGroup.management.input.dsl', {
      defaultMessage: 'Field',
    }),
  },
  {
    id: 'esql',
    'data-test-subj': 'control-editor-input-esql',
    label: i18n.translate('controls.controlGroup.management.input.esql', {
      defaultMessage: 'Query',
    }),
  },
  {
    id: 'static',
    'data-test-subj': 'control-editor-input-static',
    label: i18n.translate('controls.controlGroup.management.input.static', {
      defaultMessage: 'Static values',
    }),
  },
];

export const CONTROL_OUTPUT_OPTIONS = [
  {
    id: 'dsl',
    'data-test-subj': 'control-editor-output-dsl',
    label: i18n.translate('controls.controlGroup.management.output.dsl.label', {
      defaultMessage: 'Field filter',
    }),
    description: (isDSLInput: boolean, fieldName?: string) =>
      isDSLInput && fieldName ? (
        <FormattedMessage
          id="controls.controlGroup.management.output.dsl.description.dslToDsl"
          defaultMessage="Filter data in all dashboard panels where the {fieldName} field matches the value chosen from this control"
          values={{ fieldName: <strong>{fieldName}</strong> }}
        />
      ) : (
        i18n.translate('controls.controlGroup.management.output.dsl.description.valueToDsl', {
          defaultMessage:
            'Select a field. This control will filter data in all dashboard panels where this field matches the chosen value.',
        })
      ),
  },
  {
    id: 'esql',
    'data-test-subj': 'control-editor-output-esql',
    label: i18n.translate('controls.controlGroup.management.output.esql', {
      defaultMessage: 'ES|QL variable',
    }),
    description: () =>
      i18n.translate('controls.controlGroup.management.output.esql.description', {
        defaultMessage:
          'Define a variable. This control will set this variable to the chosen value and output it to any ES|QL panels in this dashboard.',
      }),
  },
];

export const DEFAULT_ESQL_VARIABLE_NAME = '?variable';
