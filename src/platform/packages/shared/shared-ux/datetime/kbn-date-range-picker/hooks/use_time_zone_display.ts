/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';

/**
 * Given an IANA time zone name (e.g. "Europe/Brussels") and an optional reference
 * date, returns a human-readable display string like "GMT+01:00 – Europe/Brussels"
 * or "GMT-05:00 – America/New_York (EST)", or `null` when no time zone is provided
 * or the name is unrecognised.
 *
 * When `date` is provided its value is used to resolve the UTC offset and DST
 * abbreviation; otherwise the current moment is used.
 */
export const useTimeZoneDisplay = (
  timeZone: string | undefined,
  date?: Date | null
): string | null => {
  return useMemo(() => {
    if (!timeZone) return null;
    try {
      const refDate = date ?? new Date();

      const offsetParts = new Intl.DateTimeFormat('en', {
        timeZone,
        timeZoneName: 'longOffset',
      }).formatToParts(refDate);
      const offset = offsetParts.find((p) => p.type === 'timeZoneName')?.value ?? null;
      if (!offset) return null;

      const abbrParts = new Intl.DateTimeFormat('en', {
        timeZone,
        timeZoneName: 'short',
      }).formatToParts(refDate);
      const abbr = abbrParts.find((p) => p.type === 'timeZoneName')?.value ?? null;

      // Only keep alphabetic abbreviations that are useful, like "EST" or "CET"
      const isAbbrAlphabetic = abbr !== null && /^[A-Z]/.test(abbr);
      const isAbbrDifferent = offset.substring(0, 3) !== abbr?.substring(0, 3);

      return isAbbrAlphabetic && isAbbrDifferent
        ? `${offset} \u2013 ${timeZone} (${abbr})`
        : `${offset} \u2013 ${timeZone}`;
    } catch {
      return null;
    }
  }, [timeZone, date]);
};
