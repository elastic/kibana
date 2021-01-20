/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
export const formats: Formats = {
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
      units: 'year',
    },
    months: {
      units: 'month',
    },
    days: {
      units: 'day',
    },
    hours: {
      units: 'hour',
    },
    minutes: {
      units: 'minute',
    },
    seconds: {
      units: 'second',
    },
  },
};

interface NumberFormatOptions<TStyle extends string> extends Intl.NumberFormatOptions {
  style?: TStyle;
  localeMatcher?: 'lookup' | 'best fit';
  currencyDisplay?: 'symbol' | 'code' | 'name';
}

export interface Formats {
  number?: Partial<{
    [key: string]: NumberFormatOptions<'currency' | 'percent' | 'decimal'>;
    currency: NumberFormatOptions<'currency'>;
    percent: NumberFormatOptions<'percent'>;
  }>;
  date?: Partial<{
    [key: string]: DateTimeFormatOptions;
    short: DateTimeFormatOptions;
    medium: DateTimeFormatOptions;
    long: DateTimeFormatOptions;
    full: DateTimeFormatOptions;
  }>;
  time?: Partial<{
    [key: string]: DateTimeFormatOptions;
    short: DateTimeFormatOptions;
    medium: DateTimeFormatOptions;
    long: DateTimeFormatOptions;
    full: DateTimeFormatOptions;
  }>;
  relative?: Partial<{
    [key: string]: {
      style?: 'numeric' | 'best fit';
      units: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
    };
  }>;
}

interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  weekday?: 'narrow' | 'short' | 'long';
  era?: 'narrow' | 'short' | 'long';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'narrow' | 'short' | 'long';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZoneName?: 'short' | 'long';
}
