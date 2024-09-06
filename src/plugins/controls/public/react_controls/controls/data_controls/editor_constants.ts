/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
