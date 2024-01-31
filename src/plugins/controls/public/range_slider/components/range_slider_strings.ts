/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const RangeSliderStrings = {
  control: {
    getInvalidRangeWarningTitle: () =>
      i18n.translate('controls.rangeSlider.control.invalidRangeWarningTitle', {
        defaultMessage: 'You have selected an invalid range',
      }),
    getInvalidRangeWarningContent: () =>
      i18n.translate('controls.rangeSlider.control.invalidRangeWarningMessage', {
        defaultMessage:
          'To increase Dashboard performance, invalid range selections in Controls are no longer ignored. Please select a valid range to see complete results.',
      }),
    getInvalidRangeWarningDismissButton: () =>
      i18n.translate('controls.rangeSlider.control.invalidRangeWarningConfirmButton', {
        defaultMessage: 'Do not show again',
      }),
  },
  popover: {
    getNoAvailableDataHelpText: () =>
      i18n.translate('controls.rangeSlider.popover.noAvailableDataHelpText', {
        defaultMessage: 'There is no data to display. Adjust the time range and filters.',
      }),
  },
};
