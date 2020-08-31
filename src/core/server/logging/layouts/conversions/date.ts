/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import moment from 'moment-timezone';
import { last } from 'lodash';

import { Conversion } from './type';
import { LogRecord } from '../../log_record';

const dateRegExp = /%date({(?<format>[^}]+)})?({(?<timezone>[^}]+)})?/g;

const formats = {
  ISO8601: 'ISO8601',
  ISO8601_TZ: 'ISO8601_TZ',
  ABSOLUTE: 'ABSOLUTE',
  UNIX: 'UNIX',
  UNIX_MILLIS: 'UNIX_MILLIS',
};

function formatDate(date: Date, dateFormat: string = formats.ISO8601, timezone?: string): string {
  const momentDate = moment(date);
  if (timezone) {
    momentDate.tz(timezone);
  }
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
