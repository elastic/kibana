/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../types';

export const getDateFormatSettings = (): Record<string, UiSettingsParams> => {
  const weekdays = moment.weekdays().slice();
  const [defaultWeekday] = weekdays;

  const timezones = [
    'Browser',
    ...moment.tz
      .names()
      // We need to filter out some time zones, that moment.js knows about, but Elasticsearch
      // does not understand and would fail thus with a 400 bad request when using them.
      .filter((tz) => !['America/Nuuk', 'EST', 'HST', 'ROC', 'MST'].includes(tz)),
  ];

  return {
    dateFormat: {
      name: i18n.translate('core.ui_settings.params.dateFormatTitle', {
        defaultMessage: 'Date format',
      }),
      value: 'MMM D, YYYY @ HH:mm:ss.SSS',
      description: i18n.translate('core.ui_settings.params.dateFormatText', {
        defaultMessage: 'The {formatLink} for pretty formatted dates.',
        description:
          'Part of composite text: core.ui_settings.params.dateFormatText + ' +
          'core.ui_settings.params.dateFormat.optionsLinkText',
        values: {
          formatLink:
            '<a href="https://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('core.ui_settings.params.dateFormat.optionsLinkText', {
              defaultMessage: 'format',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'dateFormat:tz': {
      name: i18n.translate('core.ui_settings.params.dateFormat.timezoneTitle', {
        defaultMessage: 'Time zone',
      }),
      value: 'Browser',
      description: i18n.translate('core.ui_settings.params.dateFormat.timezoneText', {
        defaultMessage: 'The default time zone.',
      }),
      type: 'select',
      options: timezones,
      requiresPageReload: true,
      schema: schema.string({
        validate: (value) => {
          if (!timezones.includes(value)) {
            return i18n.translate(
              'core.ui_settings.params.dateFormat.timezone.invalidValidationMessage',
              {
                defaultMessage: 'Invalid timezone: {timezone}',
                values: {
                  timezone: value,
                },
              }
            );
          }
        },
      }),
    },
    'dateFormat:scaled': {
      name: i18n.translate('core.ui_settings.params.dateFormat.scaledTitle', {
        defaultMessage: 'Scaled date format',
      }),
      type: 'json',
      value: `[
  ["", "HH:mm:ss.SSS"],
  ["PT1S", "HH:mm:ss"],
  ["PT1M", "HH:mm"],
  ["PT1H", "YYYY-MM-DD HH:mm"],
  ["P1DT", "YYYY-MM-DD"],
  ["P1YT", "YYYY"]
]`,
      description: i18n.translate('core.ui_settings.params.dateFormat.scaledText', {
        defaultMessage:
          'Values that define the format used in situations where time-based ' +
          'data is rendered in order, and formatted timestamps should adapt to the ' +
          'interval between measurements. Keys are {intervalsLink}.',
        description:
          'Part of composite text: core.ui_settings.params.dateFormat.scaledText + ' +
          'core.ui_settings.params.dateFormat.scaled.intervalsLinkText',
        values: {
          intervalsLink:
            '<a href="http://en.wikipedia.org/wiki/ISO_8601#Time_intervals" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('core.ui_settings.params.dateFormat.scaled.intervalsLinkText', {
              defaultMessage: 'ISO8601 intervals',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'dateFormat:dow': {
      name: i18n.translate('core.ui_settings.params.dateFormat.dayOfWeekTitle', {
        defaultMessage: 'Day of week',
      }),
      value: defaultWeekday,
      description: i18n.translate('core.ui_settings.params.dateFormat.dayOfWeekText', {
        defaultMessage: 'The day that starts the week.',
      }),
      type: 'select',
      options: weekdays,
      schema: schema.string({
        validate: (value) => {
          if (!weekdays.includes(value)) {
            return i18n.translate(
              'core.ui_settings.params.dayOfWeekText.invalidValidationMessage',
              {
                defaultMessage: 'Invalid day of week: {dayOfWeek}',
                values: {
                  dayOfWeek: value,
                },
              }
            );
          }
        },
      }),
    },
    dateNanosFormat: {
      name: i18n.translate('core.ui_settings.params.dateNanosFormatTitle', {
        defaultMessage: 'Date with nanoseconds format',
      }),
      value: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
      description: i18n.translate('core.ui_settings.params.dateNanosFormatText', {
        defaultMessage: 'The format for {dateNanosLink} data.',
        values: {
          dateNanosLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/master/date_nanos.html" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('core.ui_settings.params.dateNanosLinkTitle', {
              defaultMessage: 'date_nanos',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
  };
};
