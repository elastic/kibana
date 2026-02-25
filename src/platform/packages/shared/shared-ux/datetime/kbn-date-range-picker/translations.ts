/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const timeWindowButtonsTexts = {
  legend: i18n.translate('sharedUXPackages.dateRangePicker.timeWindowButtons.legend', {
    defaultMessage: 'Time window actions',
  }),

  previousLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.previousLabel',
    { defaultMessage: 'Previous' }
  ),
  previousTooltip: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.previousTooltip',
    { defaultMessage: 'Previous time window' }
  ),
  cannotShiftInvalid: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.cannotShiftInvalid',
    { defaultMessage: 'Cannot shift invalid time window' }
  ),

  nextLabel: i18n.translate('sharedUXPackages.dateRangePicker.timeWindowButtons.nextLabel', {
    defaultMessage: 'Next',
  }),
  nextTooltip: i18n.translate('sharedUXPackages.dateRangePicker.timeWindowButtons.nextTooltip', {
    defaultMessage: 'Next time window',
  }),

  zoomOutLabel: i18n.translate('sharedUXPackages.dateRangePicker.timeWindowButtons.zoomOutLabel', {
    defaultMessage: 'Zoom out',
  }),
  zoomOutTooltip: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.zoomOutTooltip',
    { defaultMessage: 'Zoom out' }
  ),
  cannotZoomOutInvalid: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.cannotZoomOutInvalid',
    { defaultMessage: 'Cannot zoom out invalid time window' }
  ),

  zoomInLabel: i18n.translate('sharedUXPackages.dateRangePicker.timeWindowButtons.zoomInLabel', {
    defaultMessage: 'Zoom in',
  }),
  zoomInTooltip: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.zoomInTooltip',
    { defaultMessage: 'Zoom in' }
  ),
  cannotZoomInInvalid: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.cannotZoomInInvalid',
    { defaultMessage: 'Cannot zoom in invalid time window' }
  ),
  cannotZoomInFurther: i18n.translate(
    'sharedUXPackages.dateRangePicker.timeWindowButtons.cannotZoomInFurther',
    { defaultMessage: 'Cannot zoom in any further' }
  ),
};
