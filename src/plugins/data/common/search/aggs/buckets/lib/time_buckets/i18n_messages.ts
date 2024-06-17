/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const dayLabel = (amount: number) =>
  i18n.translate('data.search.timeBuckets.dayLabel', {
    defaultMessage: '{amount, plural, one {a day} other {# days}}',
    values: { amount },
  });

export const hourLabel = (amount: number) =>
  i18n.translate('data.search.timeBuckets.hourLabel', {
    defaultMessage: '{amount, plural, one {an hour} other {# hours}}',
    values: { amount },
  });

export const yearLabel = () =>
  i18n.translate('data.search.timeBuckets.yearLabel', {
    defaultMessage: 'a year',
  });

export const minuteLabel = (amount: number) =>
  i18n.translate('data.search.timeBuckets.minuteLabel', {
    defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
    values: { amount },
  });

export const secondLabel = (amount: number) =>
  i18n.translate('data.search.timeBuckets.secondLabel', {
    defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
    values: { amount },
  });

export const millisecondLabel = (amount: number) =>
  i18n.translate('data.search.timeBuckets.millisecondLabel', {
    defaultMessage: '{amount, plural, one {a millisecond} other {# milliseconds}}',
    values: { amount },
  });

export const infinityLabel = () =>
  i18n.translate('data.search.timeBuckets.infinityLabel', {
    defaultMessage: 'More than a year',
  });

export const monthLabel = () =>
  i18n.translate('data.search.timeBuckets.monthLabel', {
    defaultMessage: 'a month',
  });
