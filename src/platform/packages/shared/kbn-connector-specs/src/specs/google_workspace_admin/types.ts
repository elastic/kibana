/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** Page size the connector asks for when maxResults is not set. */
export const DEFAULT_PAGE_SIZE = 100;

/**
 * listActivities page size. A live login event measured about 860 bytes (largest 1,051), so a page
 * of 100 is past what an Agent Builder tool result can hold (about 20,000 tokens). 25 events by
 * default and at most 50 keep one page well below it.
 */
export const DEFAULT_ACTIVITY_PAGE_SIZE = 25;
export const MAX_ACTIVITY_PAGE_SIZE = 50;

/**
 * Agent-safe page maxima below the vendor's own (users 500, groups 200). Live records measured at
 * most 399 bytes per user summary and 344 bytes per group, so 100 of either stays near 40 KB,
 * well inside an Agent Builder tool result; the vendor maximum would not.
 */
export const MAX_USER_PAGE_SIZE = 100;
export const MAX_GROUP_PAGE_SIZE = 100;

/**
 * Applications whose audit events activities.list returns: every value of the Reports API
 * applicationName enum (reports_v1 discovery revision 20261117), in its order and exact case.
 */
export const ACTIVITY_APPLICATIONS = [
  'access_transparency',
  'admin',
  'calendar',
  'chat',
  'drive',
  'gcp',
  'gmail',
  'gplus',
  'groups',
  'groups_enterprise',
  'jamboard',
  'login',
  'meet',
  'mobile',
  'rules',
  'saml',
  'token',
  'user_accounts',
  'context_aware_access',
  'chrome',
  'data_studio',
  'keep',
  'vault',
  'gemini_in_workspace_apps',
  'classroom',
  'assignments',
  'cloud_search',
  'tasks',
  'data_migration',
  'meet_hardware',
  'directory_sync',
  'ldap',
  'profile',
  'access_evaluation',
  'admin_data_action',
  'contacts',
  'takeout',
  'graduation',
  'voice',
  'chrome_sync',
  'workspace_studio',
  'gemini_notebook',
] as const;

/** The input values of actionMobileDevice and the Directory API action each one sends. */
export const MOBILE_DEVICE_ACTIONS = {
  block: 'block',
  wipe: 'admin_remote_wipe',
  account_wipe: 'admin_account_wipe',
} as const;

/** RFC 3339 date-time, as the Reports API pattern for startTime and endTime. */
const RFC3339 = /^(\s*|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))$/;
/**
 * Event-parameter conditions joined by commas, each "name<operator>value" (the Reports API
 * pattern for filters); blank counts as not set.
 */
const FILTER_CONDITION = /^[^<>=]+(==|<>|<=|>=|<|>).+$/;
/**
 * Checked per comma-separated part, so the check stays linear in the input length. Each event
 * parameter may appear once: the Reports API "doesn't accept multiple values of the same parameter".
 */
export const isFilterList = (value: string): boolean => {
  if (value.trim() === '') {
    return true;
  }
  const names = new Set<string>();
  return value.split(',').every((part) => {
    if (!FILTER_CONDITION.test(part)) {
      return false;
    }
    const name = part.split(/[<>=]/, 1)[0].trim();
    if (names.has(name)) {
      return false;
    }
    names.add(name);
    return true;
  });
};

/** Gmail audit events need startTime and endTime at most this far apart (Reports API rule). */
export const GMAIL_MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

/** A set time value as epoch milliseconds, or undefined when blank or missing. */
const timeOf = (value: string | undefined): number | undefined =>
  value && value.trim() !== '' ? Date.parse(value) : undefined;
/** my_customer or an account customer ID such as C01abc23d; blank counts as not set. */
const CUSTOMER_ID = /^(\s*|my_customer|C[A-Za-z0-9]+)$/;
/** An email address or an ID: no whitespace, no path separators and not a dot segment. */
const KEY = /^(?!\.{1,2}$)[^\s/]+$/;
/** KEY for an optional filter, where a blank value counts as not set. */
const OPTIONAL_KEY = /^(\s*|(?!\.{1,2}$)[^\s/]+)$/;

const userKeySchema = () =>
  z
    .string()
    .trim()
    .min(1)
    .max(320)
    .regex(KEY, 'Use a primary email, alias email or user ID')
    .describe("User's primary email, alias email or unique user ID");

const groupKeySchema = () =>
  z
    .string()
    .trim()
    .min(1)
    .max(320)
    .regex(KEY, 'Use a group email, alias or ID')
    .describe('Group email, alias or ID, for example security-team@example.com');

const customerSchema = () =>
  z
    .string()
    .trim()
    .max(64)
    .regex(CUSTOMER_ID, 'Use my_customer or a customer ID such as C01abc23d')
    .optional()
    .describe('Customer ID, or my_customer (default) for the account of the authorized admin');

const pageSize = (max: number, byDefault: number = Math.min(DEFAULT_PAGE_SIZE, max)) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .optional()
    .describe(`Results per page, 1 to ${max} (default ${byDefault})`);

const pageTokenSchema = () =>
  z.string().max(2048).optional().describe('nextPageToken from the previous page');

const optionalText = (max: number, description: string) =>
  z.string().max(max).optional().describe(description);

export const ListActivitiesInputSchema = lazySchema(() =>
  z
    .object({
      applicationName: z
        .enum(ACTIVITY_APPLICATIONS)
        .describe(
          'Application whose events are returned, for example login, admin or token; gmail needs startTime and endTime at most 30 days apart'
        ),
      userKey: z
        .string()
        .trim()
        .max(320)
        .regex(OPTIONAL_KEY, 'Use a primary email, a user ID or all')
        .optional()
        .describe('Primary email or user ID of one user, or all (default)'),
      startTime: z
        .string()
        .trim()
        .max(40)
        .regex(RFC3339, 'Use RFC 3339, for example 2026-11-01T00:00:00Z')
        .optional()
        .describe('Start of the time range, RFC 3339, for example 2026-11-01T00:00:00Z'),
      endTime: z
        .string()
        .trim()
        .max(40)
        .regex(RFC3339, 'Use RFC 3339, for example 2026-11-02T00:00:00Z')
        .optional()
        .describe('End of the time range, RFC 3339'),
      eventName: optionalText(128, 'Event name, for example login_failure'),
      filters: z
        .string()
        .max(1024)
        .refine(
          isFilterList,
          'Use parameter conditions such as login_type==exchange, each parameter once'
        )
        .optional()
        .describe(
          'Comma-separated event-parameter conditions with ==, <>, <, <=, > or >=, each parameter at most once, for example login_type==exchange'
        ),
      actorIpAddress: optionalText(
        64,
        'IP address (IPv4 or IPv6) of the user who performed the action'
      ),
      maxResults: pageSize(MAX_ACTIVITY_PAGE_SIZE, DEFAULT_ACTIVITY_PAGE_SIZE),
      pageToken: pageTokenSchema(),
    })
    .refine(
      (input) => {
        const start = timeOf(input.startTime);
        const end = timeOf(input.endTime);
        return start === undefined || end === undefined || start < end;
      },
      { message: 'startTime must be before endTime', path: ['startTime'] }
    )
    // Reports API: "The startTime must be before ... the current time when the request is made".
    .refine(
      (input) => {
        const start = timeOf(input.startTime);
        return start === undefined || start < Date.now();
      },
      { message: 'startTime must be in the past', path: ['startTime'] }
    )
    // Reports API: "For Gmail requests, startTime and endTime must be provided and the difference
    // must not be greater than 30 days."
    .refine(
      (input) => {
        if (input.applicationName !== 'gmail') {
          return true;
        }
        const start = timeOf(input.startTime);
        const end = timeOf(input.endTime);
        return start !== undefined && end !== undefined && end - start <= GMAIL_MAX_RANGE_MS;
      },
      {
        message: 'gmail needs startTime and endTime, at most 30 days apart',
        path: ['startTime'],
      }
    )
);
export type ListActivitiesInput = z.infer<typeof ListActivitiesInputSchema>;

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    customer: customerSchema(),
    domain: optionalText(253, 'Return users of this domain only, for example example.com'),
    query: optionalText(
      1024,
      'User search query, for example isSuspended=true or orgUnitPath=/Sales'
    ),
    orderBy: z
      .enum(['email', 'familyName', 'givenName'])
      .optional()
      .describe('Sort field: email, familyName or givenName'),
    maxResults: pageSize(MAX_USER_PAGE_SIZE),
    pageToken: pageTokenSchema(),
  })
);
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const GetUserInputSchema = lazySchema(() =>
  z.object({
    userKey: userKeySchema(),
    projection: z
      .enum(['basic', 'full'])
      .optional()
      .describe('basic (default) or full (adds custom schema fields)'),
    viewType: z
      .enum(['admin_view', 'domain_public'])
      .optional()
      .describe('admin_view (default) or domain_public'),
  })
);
export type GetUserInput = z.infer<typeof GetUserInputSchema>;

export const UserKeyInputSchema = lazySchema(() => z.strictObject({ userKey: userKeySchema() }));
export type UserKeyInput = z.infer<typeof UserKeyInputSchema>;

export const RevokeUserTokenInputSchema = lazySchema(() =>
  z.strictObject({
    userKey: userKeySchema(),
    clientId: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .regex(KEY, 'Use the clientId returned by listUserTokens')
      .describe('OAuth client ID of the app, from listUserTokens'),
  })
);
export type RevokeUserTokenInput = z.infer<typeof RevokeUserTokenInputSchema>;

export const RevokeAppPasswordsInputSchema = lazySchema(() =>
  z.strictObject({
    userKey: userKeySchema(),
    codeId: z
      .number()
      .int()
      .min(0)
      .max(2147483647)
      .describe('Code ID of the app password, from listAppPasswords'),
  })
);
export type RevokeAppPasswordsInput = z.infer<typeof RevokeAppPasswordsInputSchema>;

export const UpdateUserInputSchema = lazySchema(() =>
  z
    .strictObject({
      userKey: userKeySchema(),
      orgUnitPath: z
        .string()
        .max(1024)
        .regex(/^\//, 'Start the org unit path with /')
        .optional()
        .describe('Full org unit path starting with /, for example /Quarantine'),
      changePasswordAtNextLogin: z
        .boolean()
        .optional()
        .describe('Require a password change at next sign-in'),
      // null removes a recovery value (the handler sends Google the empty string that clears it).
      recoveryEmail: z
        .email()
        .max(320)
        .nullable()
        .optional()
        .describe('Recovery email address, or null to remove the current one'),
      recoveryPhone: z
        .string()
        .max(16)
        .regex(/^\+[1-9][0-9]{1,14}$/, 'Use E.164 format, for example +16505550100')
        .nullable()
        .optional()
        .describe('Recovery phone in E.164 format, for example +16505550100, or null to remove it'),
    })
    .refine(
      (input) =>
        input.orgUnitPath !== undefined ||
        input.changePasswordAtNextLogin !== undefined ||
        input.recoveryEmail !== undefined ||
        input.recoveryPhone !== undefined,
      {
        message:
          'Set at least one of orgUnitPath, changePasswordAtNextLogin, recoveryEmail or recoveryPhone',
      }
    )
);
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

export const ListGroupsInputSchema = lazySchema(() =>
  z
    .object({
      userKey: z
        .string()
        .trim()
        .max(320)
        .regex(OPTIONAL_KEY, 'Use a user email or user ID')
        .optional()
        .describe(
          'Only groups this user (email or immutable user ID) is a member of; cannot be combined with customer or query'
        ),
      customer: customerSchema(),
      domain: optionalText(253, 'Return groups of this domain only'),
      query: optionalText(
        1024,
        'Group search query, for example email:admins*; cannot be combined with userKey'
      ),
      maxResults: pageSize(MAX_GROUP_PAGE_SIZE),
      pageToken: pageTokenSchema(),
    })
    .refine((input) => !(input.userKey?.trim() && input.customer?.trim()), {
      message: 'userKey cannot be combined with customer',
    })
    // Google answers 400 "Invalid Input: searchQuery" to query together with userKey (seen live).
    .refine((input) => !(input.userKey?.trim() && input.query?.trim()), {
      message: 'userKey cannot be combined with query',
    })
);
export type ListGroupsInput = z.infer<typeof ListGroupsInputSchema>;

export const ListGroupMembersInputSchema = lazySchema(() =>
  z.object({
    groupKey: groupKeySchema(),
    roles: z
      .array(z.enum(['OWNER', 'MANAGER', 'MEMBER']))
      .min(1)
      .max(3)
      .optional()
      .describe('Only members with these roles: OWNER, MANAGER, MEMBER'),
    includeDerivedMembership: z
      .boolean()
      .optional()
      .describe('Include members of nested groups (default false)'),
    maxResults: pageSize(200),
    pageToken: pageTokenSchema(),
  })
);
export type ListGroupMembersInput = z.infer<typeof ListGroupMembersInputSchema>;

export const RemoveGroupMemberInputSchema = lazySchema(() =>
  z.strictObject({
    groupKey: groupKeySchema(),
    memberKey: z
      .string()
      .trim()
      .min(1)
      .max(320)
      .regex(KEY, 'Use a member email, alias or ID')
      .describe('Email, alias or ID of the user or group to remove'),
  })
);
export type RemoveGroupMemberInput = z.infer<typeof RemoveGroupMemberInputSchema>;

export const AddGroupMemberInputSchema = lazySchema(() =>
  z.strictObject({
    groupKey: groupKeySchema(),
    email: z.email().max(320).describe('Email of the user or group to add'),
    role: z
      .enum(['MEMBER', 'MANAGER', 'OWNER'])
      .optional()
      .describe('Role in the group: MEMBER (default), MANAGER or OWNER'),
  })
);
export type AddGroupMemberInput = z.infer<typeof AddGroupMemberInputSchema>;

export const ListRoleAssignmentsInputSchema = lazySchema(() =>
  z
    .object({
      customer: customerSchema(),
      userKey: z
        .string()
        .trim()
        .max(320)
        .regex(OPTIONAL_KEY, 'Use a primary email, alias email, or user or group ID')
        .optional()
        .describe(
          'Only assignments of this user or group (primary email, alias email, or unique user or group ID); not with roleId'
        ),
      roleId: z
        .string()
        .trim()
        .max(64)
        .regex(/^(\s*|\d+)$/, 'Use a numeric role ID')
        .optional()
        .describe('Only assignments of this numeric role ID; not with userKey'),
      includeIndirectRoleAssignments: z
        .boolean()
        .optional()
        .describe('Include roles held through groups; requires userKey'),
      maxResults: pageSize(200),
      pageToken: pageTokenSchema(),
    })
    .refine((input) => !input.includeIndirectRoleAssignments || Boolean(input.userKey?.trim()), {
      message: 'includeIndirectRoleAssignments requires userKey',
    })
    // Google answers 403 "The operation is not allowed" to userKey together with roleId (seen live).
    .refine((input) => !(input.userKey?.trim() && input.roleId?.trim()), {
      message: 'userKey cannot be combined with roleId',
    })
);
export type ListRoleAssignmentsInput = z.infer<typeof ListRoleAssignmentsInputSchema>;

export const ListRolesInputSchema = lazySchema(() =>
  z.object({
    customer: customerSchema(),
    maxResults: pageSize(100),
    pageToken: pageTokenSchema(),
  })
);
export type ListRolesInput = z.infer<typeof ListRolesInputSchema>;

export const ListMobileDevicesInputSchema = lazySchema(() =>
  z
    .object({
      customerId: customerSchema(),
      query: optionalText(
        1024,
        'Mobile device search query, for example email:user@example.com or status:approved'
      ),
      orderBy: z
        .enum(['deviceId', 'email', 'lastSync', 'model', 'name', 'os', 'status', 'type'])
        .optional()
        .describe('Sort field: deviceId, email, lastSync, model, name, os, status or type'),
      sortOrder: z
        .enum(['ASCENDING', 'DESCENDING'])
        .optional()
        .describe('Sort direction; requires orderBy'),
      maxResults: pageSize(100),
      pageToken: pageTokenSchema(),
    })
    .refine((input) => !input.sortOrder || input.orderBy !== undefined, {
      message: 'sortOrder requires orderBy',
    })
);
export type ListMobileDevicesInput = z.infer<typeof ListMobileDevicesInputSchema>;

export const ActionMobileDeviceInputSchema = lazySchema(() =>
  z.strictObject({
    customerId: customerSchema(),
    resourceId: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .regex(KEY, 'Use the resourceId returned by listMobileDevices')
      .describe('Resource ID of the mobile device, from listMobileDevices'),
    action: z
      .enum(['block', 'wipe', 'account_wipe'])
      .describe('block, wipe or account_wipe; a wipe cannot be undone'),
  })
);
export type ActionMobileDeviceInput = z.infer<typeof ActionMobileDeviceInputSchema>;
