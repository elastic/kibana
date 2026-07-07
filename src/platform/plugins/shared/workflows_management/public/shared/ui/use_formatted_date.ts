/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Borrowed from x-pack/solutions/security/plugins/security_solution/public/resolver/view/panels/use_formatted_date.ts

import moment from 'moment-timezone';
import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

const invalidDateText = i18n.translate(
  'xpack.securitySolution.enpdoint.resolver.panelutils.invaliddate',
  {
    defaultMessage: 'Invalid Date',
  }
);

/**
 * Long formatter (to second) for DateTime
 */
const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 *
 * @description formats a given time based on the user defined format in the advanced settings section of kibana under dateFormat
 * @export
 * @param {(ConstructorParameters<typeof Date>[0] | undefined)} timestamp
 * @returns {(string | null)} - Either a formatted date or the text 'Invalid Date'
 */
export function useFormattedDate(
  timestamp: ConstructorParameters<typeof Date>[0] | Date | undefined
): string | undefined {
  const uiSettings = useKibana().services.settings.client;
  const dateFormatSetting: string = uiSettings.get('dateFormat');
  const timezoneSetting: string = uiSettings.get('dateFormat:tz');
  const usableTimezoneSetting = timezoneSetting === 'Browser' ? moment.tz.guess() : timezoneSetting;

  if (!timestamp) return undefined;

  const date = new Date(timestamp);
  if (date && Number.isFinite(date.getTime())) {
    return dateFormatSetting
      ? moment.tz(date, usableTimezoneSetting).format(dateFormatSetting)
      : formatter.format(date);
  }

  return invalidDateText;
}

/**
 * Hook that formats a date with both date and time components
 * @param date Date to format
 * @returns Formatted date string with time, or undefined if invalid
 */
export function useFormattedDateTime(date: Date): string | undefined {
  const uiSettings = useKibana().services.settings.client;
  const dateFormatSetting: string = uiSettings.get('dateFormat');
  const timezoneSetting: string = uiSettings.get('dateFormat:tz');
  const usableTimezoneSetting = timezoneSetting === 'Browser' ? moment.tz.guess() : timezoneSetting;

  if (!date) {
    return undefined;
  }

  if (date && Number.isFinite(date.getTime())) {
    return dateFormatSetting
      ? moment.tz(date, usableTimezoneSetting).format(dateFormatSetting)
      : formatter.format(date);
  }

  return invalidDateText;
}

export function useGetFormattedDateTime(): (date: Date) => string | undefined {
  const uiSettings = useKibana().services.settings.client;
  const dateFormatSetting: string = uiSettings.get('dateFormat');
  const timezoneSetting: string = uiSettings.get('dateFormat:tz');
  const usableTimezoneSetting = timezoneSetting === 'Browser' ? moment.tz.guess() : timezoneSetting;

  return useCallback(
    (date: Date) => {
      if (!date) {
        return undefined;
      }

      if (!Number.isFinite(date.getTime())) {
        return invalidDateText;
      }

      return dateFormatSetting
        ? moment.tz(date, usableTimezoneSetting).format(dateFormatSetting)
        : formatter.format(date);
    },
    [dateFormatSetting, usableTimezoneSetting]
  );
}
