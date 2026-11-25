/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Response shaping: short list records, and backup-code redaction. */

type GoogleRecord = Record<string, unknown>;

const asRecord = (value: unknown): GoogleRecord =>
  typeof value === 'object' && value !== null ? (value as GoogleRecord) : {};

/** Copies the named fields that are present, in the given order. */
const pick = (source: GoogleRecord, fields: readonly string[]): GoogleRecord =>
  Object.fromEntries(
    fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]])
  );

const USER_SUMMARY_FIELDS = [
  'id',
  'primaryEmail',
  'suspended',
  'suspensionReason',
  'archived',
  'orgUnitPath',
  'isAdmin',
  'isDelegatedAdmin',
  'isEnrolledIn2Sv',
  'isEnforcedIn2Sv',
  'lastLoginTime',
  'creationTime',
] as const;

/** The short record listUsers returns for one user; getUser returns the full record. */
export const toUserSummary = (user: unknown): GoogleRecord => {
  const record = asRecord(user);
  const fullName = asRecord(record.name).fullName;
  return {
    ...pick(record, USER_SUMMARY_FIELDS.slice(0, 2)),
    ...(typeof fullName === 'string' ? { fullName } : {}),
    ...pick(record, USER_SUMMARY_FIELDS.slice(2)),
  };
};

const DEVICE_SUMMARY_FIELDS = [
  'resourceId',
  'deviceId',
  'email',
  'name',
  'model',
  'os',
  'type',
  'status',
  'lastSync',
  'firstSync',
] as const;

/** The short record listMobileDevices returns for one device. */
export const toDeviceSummary = (device: unknown): GoogleRecord =>
  pick(asRecord(device), DEVICE_SUMMARY_FIELDS);

/**
 * The backup codes of a user without their values: Google returns each valid code in clear, so
 * only the owner's user ID is kept per code. The values never leave this function.
 */
export const redactVerificationCodes = (
  items: unknown[]
): { count: number; items: Array<{ userId?: string }> } => {
  const redacted = items.map((item) => {
    const userId = asRecord(item).userId;
    return typeof userId === 'string' ? { userId } : {};
  });
  return { count: redacted.length, items: redacted };
};
