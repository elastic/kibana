/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Shapes the answers of getAccountActivity, getVaultUser and addSafeMember. */

import { IdiraApiError } from './client';
import { ACTIVITIES_DEFAULT_LIMIT } from './types';

/** 2026-11-27, 2026-11-27T10:00:00Z, 2026-11-27 10:00:00.1234567+01:00 (ASCII digits only). */
const ISO_DATE_TIME =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:([T ])[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]{1,9})?)?(Z|[+-][0-9]{2}:?[0-9]{2})?)?$/i;

/**
 * An activity's Date as epoch seconds. The vendor sample sends epoch seconds and the vendor docs
 * call it a UTC date-time, so this reads a finite number, a string of 1 to 15 ASCII digits, or an
 * ISO 8601 date or date-time (all checked after trimming). Anything else gives undefined.
 */
const activityTime = (activity: unknown): number | undefined => {
  const date =
    typeof activity === 'object' && activity !== null
      ? (activity as Record<string, unknown>).Date
      : undefined;
  if (typeof date === 'number') {
    return Number.isFinite(date) ? date : undefined;
  }
  if (typeof date !== 'string') {
    return undefined;
  }
  const text = date.trim();
  if (/^[0-9]{1,15}$/.test(text)) {
    return Number(text);
  }
  const iso = ISO_DATE_TIME.exec(text);
  if (!iso) {
    return undefined;
  }
  // The vendor docs call Date a UTC date-time: a date-time without an offset is read as UTC.
  const normalised = text.replace(' ', 'T');
  const ms = Date.parse(iso[2] || !iso[1] ? normalised : `${normalised}Z`);
  return Number.isFinite(ms) ? ms / 1000 : undefined;
};

/**
 * Keeps the newest `limit` activities of a getAccountActivity answer already checked to hold an
 * Activities list (the endpoint has no paging, so the whole list comes in one answer).
 * They are sorted newest first by Date; when any Date cannot be read, the order Privilege Cloud
 * returned is kept and newestFirst is false. Every branch returns the same keys.
 */
export const newestActivities = (body: unknown, limit = ACTIVITIES_DEFAULT_LIMIT) => {
  const { Activities: activities, Total: vendorTotal } = body as {
    Activities: unknown[];
    Total?: unknown;
  };
  const times = activities.map(activityTime);
  const newestFirst = times.every((time) => time !== undefined);
  const ordered = newestFirst
    ? activities
        .map((activity, index) => ({ activity, time: times[index] as number }))
        .sort((a, b) => b.time - a.time)
        .map(({ activity }) => activity)
    : activities;
  return {
    Activities: ordered.slice(0, limit),
    total: typeof vendorTotal === 'number' ? vendorTotal : activities.length,
    truncated: activities.length > limit,
    newestFirst,
  };
};

/**
 * Whether an addSafeMember error means the member is already in the safe: HTTP 409, or the
 * documented UserAlreadyMemberException in the vendor ErrorCode or ErrorMessage (never matched
 * against the rest of the message, which quotes the request path and so the member name).
 */
export const isAlreadyMemberError = (error: unknown): boolean =>
  error instanceof IdiraApiError &&
  (error.status === 409 ||
    [error.code, error.vendorMessage].some(
      (text) => typeof text === 'string' && text.includes('UserAlreadyMemberException')
    ));

/**
 * A vault user record plus `enabled`, the user's state: the vendor docs name it enableUser in the
 * example and enabled in the parameter table, so enableUser is read first, then enabled; null when
 * neither is a boolean. The record itself is returned as Privilege Cloud sent it.
 */
export const withEnabledState = (record: Record<string, unknown>) => {
  const state = [record.enableUser, record.enabled].find((value) => typeof value === 'boolean');
  return { ...record, enabled: typeof state === 'boolean' ? state : null };
};
