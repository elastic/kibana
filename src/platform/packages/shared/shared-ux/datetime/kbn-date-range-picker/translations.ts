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
  scrollerAriaLabel: i18n.translate('sharedUXPackages.dateRangePicker.calendar.scrollerAriaLabel', {
    defaultMessage:
      'Calendar, use arrow keys to navigate days. Press Page Up/Down to navigate months.',
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

export const documentationPanelTexts = {
  heading: i18n.translate('sharedUXPackages.dateRangePicker.documentationPanel.heading', {
    defaultMessage: 'Documentation',
  }),
  intro: i18n.translate('sharedUXPackages.dateRangePicker.documentationPanel.intro', {
    defaultMessage:
      'Type `to` to split start and end dates, otherwise the input will consider it just a one day range.',
  }),
  absoluteHeading: i18n.translate(
    'sharedUXPackages.dateRangePicker.documentationPanel.absoluteHeading',
    { defaultMessage: 'Absolute time formats' }
  ),
  absoluteBody: i18n.translate('sharedUXPackages.dateRangePicker.documentationPanel.absoluteBody', {
    defaultMessage:
      'Use formats like `Dec 1, 2025, 00:00` (default), `2025-12-01` (ISO 8601), `Fri, 1 Dec 2025 00:00:00 GMT` (RFC 2822), `1760665383890` (unix timestamp), `1st of January, 2025` or just `Jan 1st, 2025`.',
  }),
  relativeHeading: i18n.translate(
    'sharedUXPackages.dateRangePicker.documentationPanel.relativeHeading',
    { defaultMessage: 'Relative time' }
  ),
  relativeBody: i18n.translate('sharedUXPackages.dateRangePicker.documentationPanel.relativeBody', {
    defaultMessage:
      'Type `-5m`, `past 5 min`, `last 5 minutes` or any combination with words `last`, `next`, `ago`, `from now` etc.',
  }),
  combinationsHeading: i18n.translate(
    'sharedUXPackages.dateRangePicker.documentationPanel.combinationsHeading',
    { defaultMessage: 'Custom combinations' }
  ),
  combinationsBody: i18n.translate(
    'sharedUXPackages.dateRangePicker.documentationPanel.combinationsBody',
    {
      defaultMessage:
        'Custom time ranges are combinations of the aforementioned formats, e.g. `now to Fri, 1 Dec 2025 00:00:00 GMT` or `-12d to now`.',
    }
  ),
  detailedDocumentationLink: i18n.translate(
    'sharedUXPackages.dateRangePicker.documentationPanel.detailedDocumentationLink',
    { defaultMessage: 'Detailed documentation' }
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

export const settingsPanelTexts = {
  heading: i18n.translate('sharedUXPackages.dateRangePicker.settingsPanel.heading', {
    defaultMessage: 'Settings',
  }),
  autoRefreshLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.autoRefreshLabel',
    { defaultMessage: 'Refresh every' }
  ),
  autoRefreshIntervalCountAriaLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.autoRefreshIntervalCountAriaLabel',
    { defaultMessage: 'Refresh interval count' }
  ),
  autoRefreshIntervalUnitAriaLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.autoRefreshIntervalUnitAriaLabel',
    { defaultMessage: 'Refresh interval unit' }
  ),
  autoRefreshUnitSeconds: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.autoRefreshUnitSeconds',
    { defaultMessage: 'seconds' }
  ),
  autoRefreshUnitMinutes: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.autoRefreshUnitMinutes',
    { defaultMessage: 'minutes' }
  ),
  autoRefreshUnitHours: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.autoRefreshUnitHours',
    { defaultMessage: 'hours' }
  ),
  roundRelativeTimeLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.roundRelativeTimeLabel',
    { defaultMessage: 'Round relative time ranges' }
  ),
  roundRelativeTimeDescription: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.roundRelativeTimeDescription',
    { defaultMessage: 'Relative ranges round to the nearest full unit (minute, hour, etc.)' }
  ),
  timeFormatHeading: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.timeFormatHeading',
    { defaultMessage: 'Time format and zone' }
  ),
  timeFormatDescription: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.timeFormatDescription',
    {
      defaultMessage:
        'Time zone and format can be set by the space administrator in Advanced settings and affect all the users of this space.',
    }
  ),
  advancedSettingsLink: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.advancedSettingsLink',
    { defaultMessage: 'Advanced settings' }
  ),
  newTimePickerHeading: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.newTimePickerHeading',
    { defaultMessage: 'New time picker' }
  ),
  newTimePickerDescription: i18n.translate(
    'sharedUXPackages.dateRangePicker.settingsPanel.newTimePickerDescription',
    {
      defaultMessage:
        'Don\'t like new time picker UX? Opt out from it in advanced settings under "".',
    }
  ),
};

export const autoRefreshButtonTexts = {
  pauseAriaLabel: (timeRemainingLabel: string) =>
    i18n.translate('sharedUXPackages.dateRangePicker.autoRefreshButton.pauseAriaLabel', {
      defaultMessage:
        'Auto-refresh active, next refresh in {timeRemainingLabel}. Activate to pause.',
      values: { timeRemainingLabel },
    }),
  resumeAriaLabel: (intervalCountdownLabel: string) =>
    i18n.translate('sharedUXPackages.dateRangePicker.autoRefreshButton.resumeAriaLabel', {
      defaultMessage:
        'Auto-refresh paused, refresh interval is {intervalCountdownLabel}. Activate to resume.',
      values: { intervalCountdownLabel },
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
  settingsAriaLabel: i18n.translate(
    'sharedUXPackages.dateRangePicker.mainPanel.settingsAriaLabel',
    { defaultMessage: 'Settings' }
  ),
};
