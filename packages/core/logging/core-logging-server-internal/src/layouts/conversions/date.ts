/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { last } from 'lodash';
import { LogRecord } from '@kbn/logging';

import { Conversion } from './type';

const dateRegExp = /%date({(?<format>[^}]+)})?({(?<timezone>[^}]+)})?/g;

const formats = {
  ISO8601: 'ISO8601',
  ISO8601_TZ: 'ISO8601_TZ',
  ABSOLUTE: 'ABSOLUTE',
  UNIX: 'UNIX',
  UNIX_MILLIS: 'UNIX_MILLIS',
};

function formatDate(
  date: Date,
  dateFormat: string = formats.ISO8601_TZ,
  timezone?: string
): string {
  const momentDate = moment(date);
  momentDate.tz(timezone ?? moment.tz.guess());

  switch (dateFormat) {
    case formats.ISO8601:
      return momentDate.toISOString();
    case formats.ISO8601_TZ:
      return momentDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    case formats.ABSOLUTE:
      return momentDate.format('HH:mm:ss.SSS');
    case formats.UNIX:
      return momentDate.format('X');
    case formats.UNIX_MILLIS:
      return momentDate.format('x');
    default:
      throw new Error(`Unknown format: ${dateFormat}`);
  }
}

function validateDateFormat(input: string) {
  if (!Reflect.has(formats, input)) {
    throw new Error(
      `Date format expected one of ${Reflect.ownKeys(formats).join(', ')}, but given: ${input}`
    );
  }
}

function validateTimezone(timezone: string) {
  if (moment.tz.zone(timezone)) return;
  throw new Error(`Unknown timezone: ${timezone}`);
}

function validate(rawString: string) {
  for (const matched of rawString.matchAll(dateRegExp)) {
    const { format, timezone } = matched.groups!;

    if (format) {
      validateDateFormat(format);
    }
    if (timezone) {
      validateTimezone(timezone);
    }
  }
}

export const DateConversion: Conversion = {
  pattern: dateRegExp,
  convert(record: LogRecord, highlight: boolean, ...matched: any[]) {
    const groups: Record<string, string | undefined> = last(matched);
    const { format, timezone } = groups;

    return formatDate(record.timestamp, format, timezone);
  },
  validate,
};
