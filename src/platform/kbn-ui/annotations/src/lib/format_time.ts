/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const MINUTE = 60 * 1000;
const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * MINUTE },
  { unit: 'month', ms: 30 * 24 * 60 * MINUTE },
  { unit: 'day', ms: 24 * 60 * MINUTE },
  { unit: 'hour', ms: 60 * MINUTE },
  { unit: 'minute', ms: MINUTE },
];

let formatter: { locale: string; instance: Intl.RelativeTimeFormat } | undefined;

const relativeTimeFormat = (): Intl.RelativeTimeFormat => {
  const locale = i18n.getLocale();
  if (formatter?.locale !== locale) {
    formatter = { locale, instance: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }) };
  }
  return formatter.instance;
};

/** `5 minutes ago` / `in 2 days` style label in the UI's locale; timestamps within a minute of `now` are "just now". */
export const formatRelativeTime = (iso: string, now: number = Date.now()): string => {
  const elapsed = now - Date.parse(iso);
  if (Number.isNaN(elapsed)) {
    return iso;
  }
  const distance = Math.abs(elapsed);
  if (distance < MINUTE) {
    return i18n.translate('kbnUI.annotations.time.justNow', { defaultMessage: 'just now' });
  }
  const { unit, ms } =
    UNITS.find((candidate) => distance >= candidate.ms) ?? UNITS[UNITS.length - 1];
  return relativeTimeFormat().format(-Math.round(elapsed / ms), unit);
};
