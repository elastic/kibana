/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const TimeSliderStrings = {
  control: {
    getClearSelection: () =>
      i18n.translate('controls.timeSlider.popover.clearTimeTitle', {
        defaultMessage: 'Clear time selection',
      }),
    getPinStart: () =>
      i18n.translate('controls.timeSlider.settings.pinStart', {
        defaultMessage: 'Pin start',
      }),
    getUnpinStart: () =>
      i18n.translate('controls.timeSlider.settings.unpinStart', {
        defaultMessage: 'Unpin start',
      }),
  },
};
