/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomFormats } from '@formatjs/intl';
export type Formats = CustomFormats;
/**
 * Default format options used for "en" locale.
 * These are used when constructing the internal Intl.NumberFormat
 * (`number` formatter) and Intl.DateTimeFormat (`date` and `time` formatters) instances.
 * The value of each parameter of `number` formatter is options object which is
 * described in `options` section of [NumberFormat constructor].
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat}
 * The value of each parameter of `date` and `time` formatters is options object which is
 * described in `options` section of [DateTimeFormat constructor].
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat}
 */
export const defaultEnFormats: CustomFormats = {
  number: {
    currency: {
      style: 'currency',
    },
    percent: {
      style: 'percent',
    },
  },
  date: {
    short: {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    },
    medium: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
    long: {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
    full: {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
  },
  time: {
    short: {
      hour: 'numeric',
      minute: 'numeric',
    },
    medium: {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    },
    long: {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
    },
    full: {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
    },
  },
  relative: {
    years: {
      style: 'long',
    },
    months: {
      style: 'long',
    },
    days: {
      style: 'long',
    },
    hours: {
      style: 'long',
    },
    minutes: {
      style: 'long',
    },
    seconds: {
      style: 'long',
    },
  },
};
