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

export const dialogTexts = {
  ariaLabel: i18n.translate('sharedUXPackages.dateRangePicker.dialog.ariaLabel', {
    defaultMessage: 'Date range picker dialog',
  }),
};

export const calendarTexts = {
  todayButton: i18n.translate('sharedUXPackages.dateRangePicker.calendar.todayButton', {
    defaultMessage: 'Today',
  }),
};

export const calendarPanelTexts = {
  saveAsPreset: i18n.translate('sharedUXPackages.dateRangePicker.calendarPanel.saveAsPreset', {
    defaultMessage: 'Save as preset',
  }),
  applyButton: i18n.translate('sharedUXPackages.dateRangePicker.calendarPanel.applyButton', {
    defaultMessage: 'Apply',
  }),
  selectEndDateTooltip: i18n.translate(
    'sharedUXPackages.dateRangePicker.calendarPanel.selectEndDateTooltip',
    { defaultMessage: 'Select an end date to apply' }
  ),
};

export const customTimeRangePanelTexts = {
  heading: i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.heading', {
    defaultMessage: 'Custom time range',
  }),
  startDateLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.startDateLabel',
    { defaultMessage: 'Start date' }
  ),
  endDateLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.endDateLabel',
    { defaultMessage: 'End date' }
  ),
  relativeTab: i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.relativeTab', {
    defaultMessage: 'Relative',
  }),
  absoluteTab: i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.absoluteTab', {
    defaultMessage: 'Absolute',
  }),
  nowTab: i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.nowTab', {
    defaultMessage: 'Now',
  }),
  countAriaLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.countAriaLabel',
    { defaultMessage: 'Count' }
  ),
  unitDirectionAriaLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.unitDirectionAriaLabel',
    { defaultMessage: 'Unit and direction' }
  ),
  absoluteDateAriaLabel: (label: string) =>
    i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.absoluteDateAriaLabel', {
      defaultMessage: '{label} absolute date',
      values: { label },
    }),
  nowStartHelpText: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.nowStartHelpText',
    { defaultMessage: 'Start time will be set to the time of the refresh.' }
  ),
  nowEndHelpText: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.nowEndHelpText',
    { defaultMessage: 'End time will be set to the time of the refresh.' }
  ),
  shorthandLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.shorthandLabel',
    { defaultMessage: 'Shorthand' }
  ),
  shorthandHelpText: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.shorthandHelpText',
    {
      defaultMessage: 'You can type this directly in the time picker to get the same time range',
    }
  ),
  shorthandSyntaxLink: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.shorthandSyntaxLink',
    { defaultMessage: 'Shorthand syntax' }
  ),
  shorthandCopied: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.shorthandCopied',
    { defaultMessage: 'Shorthand copied' }
  ),
  copyShorthandTooltip: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.copyShorthandTooltip',
    { defaultMessage: 'Copy shorthand to clipboard' }
  ),
  applyButton: i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.applyButton', {
    defaultMessage: 'Apply',
  }),
  saveAsPresetCheckbox: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.saveAsPresetCheckbox',
    { defaultMessage: 'Save as preset' }
  ),
  endBeforeStartError: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.endBeforeStartError',
    { defaultMessage: 'End date must be later than start date' }
  ),
  notAvailable: i18n.translate(
    'sharedUXPackages.dateRangePicker.customTimeRangePanel.notAvailable',
    { defaultMessage: '(not available)' }
  ),
  unitPastSuffix: (unit: string) =>
    i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.unitPastSuffix', {
      defaultMessage: '{unit}s ago',
      values: { unit },
    }),
  unitFutureSuffix: (unit: string) =>
    i18n.translate('sharedUXPackages.dateRangePicker.customTimeRangePanel.unitFutureSuffix', {
      defaultMessage: '{unit}s from now',
      values: { unit },
    }),
};

export const mainPanelTexts = {
  presetsLabel: i18n.translate('sharedUXPackages.dateRangePicker.mainPanel.presetsLabel', {
    defaultMessage: 'Presets',
  }),
  recentLabel: i18n.translate('sharedUXPackages.dateRangePicker.mainPanel.recentLabel', {
    defaultMessage: 'Recent',
  }),
  calendarPanelTitle: i18n.translate(
    'sharedUXPackages.dateRangePicker.mainPanel.calendarPanelTitle',
    { defaultMessage: 'Calendar' }
  ),
  customTimeRangePanelTitle: i18n.translate(
    'sharedUXPackages.dateRangePicker.mainPanel.customTimeRangePanelTitle',
    { defaultMessage: 'Custom time range' }
  ),
  savePresetTooltip: i18n.translate(
    'sharedUXPackages.dateRangePicker.mainPanel.savePresetTooltip',
    { defaultMessage: 'Save input range as preset and apply it' }
  ),
  deletePresetAriaLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.mainPanel.deletePresetAriaLabel',
    { defaultMessage: 'Delete preset' }
  ),
};
