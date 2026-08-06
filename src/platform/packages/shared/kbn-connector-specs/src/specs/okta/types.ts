/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** Okta user id (`00u…`), login, or unambiguous login shortname. */
const MAX_USER_ID_LENGTH = 256;
/** Okta group id (`00g…`). */
const MAX_GROUP_ID_LENGTH = 128;
const MAX_FILTER_LENGTH = 1024;
const MAX_SEARCH_LENGTH = 512;
const MAX_LOG_LIMIT = 1000;
const MAX_USER_LIMIT = 200;

export const UserIdSchema = z
  .string()
  .min(1)
  .max(MAX_USER_ID_LENGTH)
  .describe(
    'Okta user id (for example 00u1a2b3c4d5e6f7g8h9), login, or unambiguous login shortname. Prefer the id returned by getUser, listUsers, or searchUsers for write actions.'
  );

export const GroupIdSchema = z
  .string()
  .min(1)
  .max(MAX_GROUP_ID_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: 'Group id must contain only letters, numbers, underscores, and hyphens',
  })
  .describe('Okta group id (for example 00g1a2b3c4d5e6f7g8h9).');

export const GetUserInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
  })
);
export type GetUserInput = z.infer<typeof GetUserInputSchema>;

export const GetUserGroupsInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
  })
);
export type GetUserGroupsInput = z.infer<typeof GetUserGroupsInputSchema>;

export const SuspendUserInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema.describe(
      'Id of an ACTIVE user to suspend. Suspended users cannot sign in; group and app assignments are retained.'
    ),
  })
);
export type SuspendUserInput = z.infer<typeof SuspendUserInputSchema>;

export const UnsuspendUserInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema.describe('Id of a SUSPENDED user to restore to ACTIVE.'),
  })
);
export type UnsuspendUserInput = z.infer<typeof UnsuspendUserInputSchema>;

export const DeactivateUserInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema.describe(
      'Id of the user to deactivate (DEPROVISIONED). Prefer suspend for reversible containment; deactivate is a stronger lifecycle step.'
    ),
    sendEmail: z
      .boolean()
      .optional()
      .describe(
        'When true, Okta sends a deactivation email to the user. Defaults to false when omitted.'
      ),
  })
);
export type DeactivateUserInput = z.infer<typeof DeactivateUserInputSchema>;

export const ActivateUserInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema.describe(
      'Id of a STAGED or DEPROVISIONED user to activate. Activation may be asynchronous.'
    ),
    sendEmail: z
      .boolean()
      .optional()
      .describe(
        'When true, Okta emails an activation/welcome link. Defaults to false when omitted.'
      ),
  })
);
export type ActivateUserInput = z.infer<typeof ActivateUserInputSchema>;

export const ClearUserSessionsInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    oauthTokens: z
      .boolean()
      .optional()
      .describe(
        'When true, also revokes OIDC/OAuth access and refresh tokens issued to the user. Defaults to false.'
      ),
    forgetDevices: z
      .boolean()
      .optional()
      .describe('When true, also clears remembered factors for all devices. Defaults to false.'),
  })
);
export type ClearUserSessionsInput = z.infer<typeof ClearUserSessionsInputSchema>;

export const ResetFactorsInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema.describe(
      'Id of a user whose enrolled MFA factors should be reset to unenrolled. User status stays ACTIVE.'
    ),
  })
);
export type ResetFactorsInput = z.infer<typeof ResetFactorsInputSchema>;

export const GetUserFactorsInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
  })
);
export type GetUserFactorsInput = z.infer<typeof GetUserFactorsInputSchema>;

export const ResetPasswordInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    sendEmail: z
      .boolean()
      .describe(
        'Required. When true, Okta emails the password-reset link. When false, the response includes a resetPasswordUrl for a custom flow. Transitions the user to RECOVERY.'
      ),
    revokeSessions: z
      .boolean()
      .optional()
      .describe(
        'When true, revokes the user sessions (except the current session if owned by this user). Defaults to false.'
      ),
  })
);
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const ExpirePasswordInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    tempPassword: z
      .boolean()
      .optional()
      .describe(
        'When true, expires the password and returns a temporary password (expire_password_with_temp_password). When false or omitted, only marks the password expired so the user must change it at next sign-in.'
      ),
  })
);
export type ExpirePasswordInput = z.infer<typeof ExpirePasswordInputSchema>;

export const AddUserToGroupInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    groupId: GroupIdSchema.describe(
      'Target group id, for example a quarantine or remediation group.'
    ),
  })
);
export type AddUserToGroupInput = z.infer<typeof AddUserToGroupInputSchema>;

export const RemoveUserFromGroupInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    groupId: GroupIdSchema.describe(
      'Group id to remove the user from (for example a privileged group).'
    ),
  })
);
export type RemoveUserFromGroupInput = z.infer<typeof RemoveUserFromGroupInputSchema>;

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_USER_LIMIT)
      .optional()
      .describe('Page size (1-200). Okta defaults to 10 when omitted.'),
    after: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe('Pagination cursor from the previous response Link header (rel=next after=…).'),
    sortBy: z
      .string()
      .max(128)
      .optional()
      .describe('Field to sort by, for example status or lastUpdated.'),
    sortOrder: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('Sort direction when sortBy is set. Defaults to asc.'),
  })
);
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const SearchUsersInputSchema = lazySchema(() =>
  z
    .object({
      q: z
        .string()
        .max(MAX_SEARCH_LENGTH)
        .optional()
        .describe(
          'Simple keyword search across firstName, lastName, and email. Example: "alice@example.com".'
        ),
      search: z
        .string()
        .max(MAX_FILTER_LENGTH)
        .optional()
        .describe(
          'Advanced search expression. Example: profile.email eq "alice@example.com". Prefer this for precise attribute matches.'
        ),
      filter: z
        .string()
        .max(MAX_FILTER_LENGTH)
        .optional()
        .describe(
          'SCIM filter expression. Example: status eq "ACTIVE". Do not combine with search in the same request.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_USER_LIMIT)
        .optional()
        .describe('Page size (1-200). Okta defaults to 10 when omitted.'),
      after: z
        .string()
        .max(MAX_FILTER_LENGTH)
        .optional()
        .describe('Pagination cursor from a previous Link header.'),
    })
    .refine((value) => !(value.search && value.filter), {
      message: 'Do not combine search and filter in the same Okta users request',
      path: ['filter'],
    })
);
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;

export const GetLogsInputSchema = lazySchema(() =>
  z.object({
    since: z
      .string()
      .max(64)
      .optional()
      .describe(
        'Inclusive lower bound as an ISO 8601 timestamp. Example: 2024-01-01T00:00:00.000Z.'
      ),
    until: z
      .string()
      .max(64)
      .optional()
      .describe(
        'Exclusive upper bound as an ISO 8601 timestamp. Example: 2024-01-02T00:00:00.000Z.'
      ),
    filter: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe(
        'System Log filter expression. Example: eventType eq "user.session.start" and outcome.result eq "FAILURE".'
      ),
    q: z
      .string()
      .max(MAX_SEARCH_LENGTH)
      .optional()
      .describe('Case-insensitive keyword filter across log events.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LOG_LIMIT)
      .optional()
      .describe('Number of events to return (1-1000). Okta defaults to 100.'),
    sortOrder: z
      .enum(['ASCENDING', 'DESCENDING'])
      .optional()
      .describe('Sort order by published time. Defaults to ASCENDING.'),
    after: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe('Pagination cursor from the previous response Link header.'),
  })
);
export type GetLogsInput = z.infer<typeof GetLogsInputSchema>;
