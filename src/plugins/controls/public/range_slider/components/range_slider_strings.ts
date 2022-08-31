/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const RangeSliderStrings = {
  popover: {
    getClearRangeButtonTitle: () =>
      i18n.translate('controls.rangeSlider.popover.clearRangeTitle', {
        defaultMessage: 'Clear range',
      }),
    getNoDataHelpText: () =>
      i18n.translate('controls.rangeSlider.popover.noDataHelpText', {
        defaultMessage: 'Selected range resulted in no data. No filter was applied.',
      }),
    getNoAvailableDataHelpText: () =>
      i18n.translate('controls.rangeSlider.popover.noAvailableDataHelpText', {
        defaultMessage: 'There is no data to display. Adjust the time range and filters.',
      }),
  },
};
