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
  const usableTimezoneSetting = resolveKibanaTimeZone(uiSettings.get('dateFormat:tz'));

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
  const usableTimezoneSetting = resolveKibanaTimeZone(uiSettings.get('dateFormat:tz'));

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
  const usableTimezoneSetting = resolveKibanaTimeZone(uiSettings.get('dateFormat:tz'));

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

/** Resolved IANA zone for Kibana `dateFormat:tz` ("Browser" → local guess). */
export function resolveKibanaTimeZone(timezoneSetting: string | undefined): string {
  if (!timezoneSetting || timezoneSetting === 'Browser') {
    return moment.tz.guess();
  }
  return timezoneSetting;
}

export function useKibanaTimeZone(): string {
  const uiSettings = useKibana().services.settings.client;
  return resolveKibanaTimeZone(uiSettings.get('dateFormat:tz'));
}

const TOOLTIP_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
const HEADER_FORMAT = 'MMM D, YYYY @ HH:mm:ss';
const STARTED_TIME_FORMAT = 'HH:mm';
const STARTED_OLDER_FORMAT = 'MMM D HH:mm';

export type ExecutionTimestampVariant = 'tooltip' | 'started' | 'header';

/**
 * Shared execution-timestamp formatter.
 *
 * - `tooltip`: `Aug 24, 2026 @ 18:26:58.239 PDT` (ms + short zone)
 * - `header`: `Aug 24, 2026 @ 18:26:58` (no ms, no zone)
 * - `started`: `18:26` today, `Yesterday 22:04`, or `Aug 17 14:03`
 */
export function formatExecutionTimestamp(
  value: Date | string | null | undefined,
  variant: ExecutionTimestampVariant,
  options: { timeZoneSetting?: string; now?: Date } = {}
): string | null {
  const date = toValidDate(value);
  if (!date) {
    return null;
  }

  const zone = resolveKibanaTimeZone(options.timeZoneSetting);
  const m = moment.tz(date, zone);

  if (variant === 'tooltip') {
    return `${m.format(TOOLTIP_FORMAT)} ${formatZoneAbbreviation(date, zone)}`;
  }

  if (variant === 'header') {
    return m.format(HEADER_FORMAT);
  }

  const now = options.now ?? new Date();
  const today = moment.tz(now, zone);
  if (m.isSame(today, 'day')) {
    return m.format(STARTED_TIME_FORMAT);
  }
  if (m.isSame(today.clone().subtract(1, 'day'), 'day')) {
    return i18n.translate('workflows.workflowExecutionList.started.yesterday', {
      defaultMessage: 'Yesterday {time}',
      values: { time: m.format(STARTED_TIME_FORMAT) },
    });
  }
  return m.format(STARTED_OLDER_FORMAT);
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Short zone designator (`PDT`, `UTC`), or `GMT±offset` when the zone has no abbreviation.
 * Never returns an IANA id or a parenthesized offset.
 */
function formatZoneAbbreviation(at: Date, timeZone: string): string {
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC') {
    return 'UTC';
  }

  const m = moment.tz(at, timeZone);
  const abbr = m.format('z');
  const looksLikeOffset = /^[+-]\d/.test(abbr);
  const looksLikeIana = abbr.includes('/');
  if (abbr && !looksLikeOffset && !looksLikeIana) {
    return abbr;
  }

  return formatGmtOffset(m.format('Z'));
}

/** `+05:30` → `GMT+5:30`; `-07:00` → `GMT-7`. */
function formatGmtOffset(offset: string): string {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return `GMT${offset}`;
  }
  const [, sign, hours, minutes] = match;
  const h = Number(hours);
  return minutes === '00' ? `GMT${sign}${h}` : `GMT${sign}${h}:${minutes}`;
}
