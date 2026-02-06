/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const RangeSliderStrings = {
  control: {
    getDisplayName: () =>
      i18n.translate('controls.rangeSliderControl.displayName', {
        defaultMessage: 'range slider',
      }),
    getInvalidSelectionWarningLabel: () =>
      i18n.translate('controls.rangeSlider.control.invalidSelectionWarningLabel', {
        defaultMessage: 'Selected range returns no results.',
      }),
    getLowerBoundAriaLabel: (fieldName: string) =>
      i18n.translate('controls.rangeSlider.control.lowerBoundAriaLabel', {
        defaultMessage: 'Range slider lower bound for {fieldName}',
        values: { fieldName },
      }),
    getUpperBoundAriaLabel: (fieldName: string) =>
      i18n.translate('controls.rangeSlider.control.lowerBoundAriaLabel', {
        defaultMessage: 'Range slider upper bound for {fieldName}',
        values: { fieldName },
      }),
  },
  editor: {
    getStepTitle: () =>
      i18n.translate('controls.rangeSlider.editor.stepSizeTitle', {
        defaultMessage: 'Step size',
      }),
  },
  popover: {
    getNoAvailableDataHelpText: () =>
      i18n.translate('controls.rangeSlider.popover.noAvailableDataHelpText', {
        defaultMessage: 'There is no data to display. Adjust the time range and filters.',
      }),
  },
};
