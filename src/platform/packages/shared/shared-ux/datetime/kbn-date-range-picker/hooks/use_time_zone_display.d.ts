/**
 * Given an IANA time zone name (e.g. "Europe/Brussels") and an optional reference
 * date, returns a human-readable display string like "GMT+01:00 – Europe/Brussels"
 * or "GMT-05:00 – America/New_York (EST)", or `null` when no time zone is provided
 * or the name is unrecognised.
 *
 * When `date` is provided its value is used to resolve the UTC offset and DST
 * abbreviation; otherwise the current moment is used.
 */
export declare const useTimeZoneDisplay: (timeZone: string | undefined, date?: Date | null, abbreviated?: boolean) => string | null;
