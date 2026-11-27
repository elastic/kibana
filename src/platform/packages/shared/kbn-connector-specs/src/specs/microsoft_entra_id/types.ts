/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  DELETABLE_METHOD_TYPES,
  GUID_PATTERN,
  MAX_JSON_BODY_BYTES,
  MAX_NEXT_LINK_LENGTH,
  MAX_ODATA_EXPRESSION_LENGTH,
  MAX_PAGE_SIZE,
  MAX_RAW_PATH_LENGTH,
  MAX_RAW_QUERY_ENTRIES,
  MAX_RISKY_USERS_PAGE_SIZE,
  MAX_RISKY_USER_IDS,
  MAX_SELECT_PROPERTIES,
  MAX_UPDATE_PROPERTIES,
  MAX_USER_ID_LENGTH,
  PROPERTY_NAME_PATTERN,
} from './constants';
import { PATH_ID_RULE, isAllowedRawPath, isSafePathId } from './graph_client';

const GUID_LENGTH = 36;

const utf8Bytes = (value: string): number => new TextEncoder().encode(value).length;

/** Serialized size of a JSON value in UTF-8 bytes; Infinity when it cannot be serialized. */
export const jsonByteLength = (value: unknown): number => {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? 0 : utf8Bytes(serialized);
  } catch {
    return Infinity;
  }
};

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

const UserIdSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .min(1)
    .max(MAX_USER_ID_LENGTH)
    .refine(isSafePathId, PATH_ID_RULE)
    .describe('Object id (GUID) or userPrincipalName of the user, from getUser or listUsers')
);

const UserObjectIdSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .max(GUID_LENGTH)
    .regex(GUID_PATTERN, 'Must be an object id (GUID)')
    .describe('User object id (GUID); resolve a userPrincipalName with getUser first')
);

const GroupIdSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .max(GUID_LENGTH)
    .regex(GUID_PATTERN, 'Must be a group object id (GUID)')
    .describe('Group object id (GUID), from listGroups or getUserGroups')
);

const FilterSchema = lazySchema(() =>
  z
    .string()
    .max(MAX_ODATA_EXPRESSION_LENGTH)
    .optional()
    .describe("OData filter, for example department eq 'Sales'")
);

const SearchSchema = lazySchema(() =>
  z
    .string()
    .max(MAX_ODATA_EXPRESSION_LENGTH)
    .optional()
    .describe('Search in "property:text" form, quotes included, for example "displayName:smith"')
);

const topSchema = (max: number) =>
  z.number().int().min(1).max(max).optional().describe(`Page size, 1 to ${max}`);

const SelectSchema = lazySchema(() =>
  z
    .array(z.string().max(64).regex(PROPERTY_NAME_PATTERN, 'Must be a property name'))
    .min(1)
    .max(MAX_SELECT_PROPERTIES)
    .optional()
    .describe('Property names to return, for example ["displayName", "accountEnabled"]')
);

const AdvancedQuerySchema = lazySchema(() =>
  z
    .boolean()
    .optional()
    .describe('Set true for advanced filters (endsWith, ne, not) or to get the total count')
);

const NextLinkSchema = lazySchema(() =>
  z
    .string()
    .max(MAX_NEXT_LINK_LENGTH)
    .optional()
    .describe('nextLink from the previous page; when set, the other query inputs are ignored')
);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const GetUserInputSchema = lazySchema(() =>
  z.object({
    userId: z
      .string()
      .trim()
      .min(1)
      .max(MAX_USER_ID_LENGTH)
      .refine(isSafePathId, PATH_ID_RULE)
      .describe('Object id (GUID), userPrincipalName or email address of the user'),
    select: SelectSchema,
  })
);
export type GetUserInput = z.infer<typeof GetUserInputSchema>;

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    filter: FilterSchema,
    search: SearchSchema,
    top: topSchema(MAX_PAGE_SIZE),
    select: SelectSchema,
    advancedQuery: AdvancedQuerySchema,
    nextLink: NextLinkSchema,
  })
);
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const UserIdInputSchema = lazySchema(() => z.object({ userId: UserIdSchema }));
export type UserIdInput = z.infer<typeof UserIdInputSchema>;

export const ResetUserPasswordInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    newPassword: z
      .string()
      .min(1)
      .max(256)
      .describe(
        "New password meeting the tenant's password policy. Saved with the call's inputs; not returned"
      ),
    forceChangePasswordNextSignIn: z
      .boolean()
      .optional()
      .describe('Require a new password at next sign-in (default true)'),
  })
);
export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordInputSchema>;

export const CreateUserInputSchema = lazySchema(() =>
  z.object({
    accountEnabled: z.boolean().describe('Whether the account can sign in'),
    displayName: z.string().trim().min(1).max(256).describe('Display name'),
    mailNickname: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]+$/, 'Must be a mail alias without spaces or @')
      .describe('Mail alias, for example jdoe'),
    userPrincipalName: z
      .string()
      .trim()
      .min(3)
      .max(113)
      .regex(
        /^[^@\s]{1,64}@[^@\s]{1,48}$/,
        'Must be alias@domain, with at most 64 characters before the @ and 48 after it'
      )
      .describe('Sign-in name on a verified domain of the tenant, for example jdoe@contoso.com'),
    password: z
      .string()
      .min(1)
      .max(256)
      .describe("Initial password meeting the password policy. Saved with the call's inputs"),
    forceChangePasswordNextSignIn: z
      .boolean()
      .optional()
      .describe('Require a new password at first sign-in (default true)'),
  })
);
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const UpdateUserInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    properties: z
      .record(
        z.string().max(64).regex(PROPERTY_NAME_PATTERN, 'Must be a property name'),
        z.unknown()
      )
      .refine((v) => Object.keys(v).length >= 1, { message: 'Give at least one property' })
      .refine((v) => Object.keys(v).length <= MAX_UPDATE_PROPERTIES, {
        message: `At most ${MAX_UPDATE_PROPERTIES} properties`,
      })
      .refine((v) => !Object.keys(v).some((k) => k.toLowerCase() === 'passwordprofile'), {
        message: 'passwordProfile is not accepted; use resetUserPassword',
      })
      .refine((v) => jsonByteLength(v) <= MAX_JSON_BODY_BYTES, {
        message: `properties must serialize to at most ${MAX_JSON_BODY_BYTES} bytes`,
      })
      .describe('User properties to set, for example {"department": "Finance", "jobTitle": "CFO"}'),
  })
);
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

// ---------------------------------------------------------------------------
// Authentication methods
// ---------------------------------------------------------------------------

export const DeleteAuthMethodInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    methodType: z
      .enum(DELETABLE_METHOD_TYPES)
      .describe('methodType of the method, as returned by getUserAuthMethods'),
    methodId: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .refine(isSafePathId, PATH_ID_RULE)
      .describe('id of the method, as returned by getUserAuthMethods'),
  })
);
export type DeleteAuthMethodInput = z.infer<typeof DeleteAuthMethodInputSchema>;

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export const GetUserGroupsInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    transitive: z
      .boolean()
      .optional()
      .describe('Include nested memberships (default true); false returns direct ones only'),
    top: topSchema(MAX_PAGE_SIZE),
    nextLink: NextLinkSchema,
  })
);
export type GetUserGroupsInput = z.infer<typeof GetUserGroupsInputSchema>;

export const ListGroupMembersInputSchema = lazySchema(() =>
  z.object({
    groupId: GroupIdSchema,
    top: topSchema(MAX_PAGE_SIZE),
    select: SelectSchema,
    nextLink: NextLinkSchema,
  })
);
export type ListGroupMembersInput = z.infer<typeof ListGroupMembersInputSchema>;

export const ListGroupsInputSchema = lazySchema(() =>
  z.object({
    filter: FilterSchema,
    search: SearchSchema,
    top: topSchema(MAX_PAGE_SIZE),
    advancedQuery: AdvancedQuerySchema,
    nextLink: NextLinkSchema,
  })
);
export type ListGroupsInput = z.infer<typeof ListGroupsInputSchema>;

export const GroupMembershipInputSchema = lazySchema(() =>
  z.object({ groupId: GroupIdSchema, userId: UserObjectIdSchema })
);
export type GroupMembershipInput = z.infer<typeof GroupMembershipInputSchema>;

// ---------------------------------------------------------------------------
// Identity Protection
// ---------------------------------------------------------------------------

export const ListRiskyUsersInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(MAX_ODATA_EXPRESSION_LENGTH)
      .optional()
      .describe("OData filter, for example riskLevel eq 'high'"),
    top: topSchema(MAX_RISKY_USERS_PAGE_SIZE),
    nextLink: NextLinkSchema,
  })
);
export type ListRiskyUsersInput = z.infer<typeof ListRiskyUsersInputSchema>;

export const RiskyUserIdsInputSchema = lazySchema(() =>
  z.object({
    userIds: z
      .array(
        z.string().trim().max(GUID_LENGTH).regex(GUID_PATTERN, 'Must be a user object id (GUID)')
      )
      .min(1)
      .max(MAX_RISKY_USER_IDS)
      .describe('User object ids (GUIDs)'),
  })
);
export type RiskyUserIdsInput = z.infer<typeof RiskyUserIdsInputSchema>;

// ---------------------------------------------------------------------------
// App role assignments
// ---------------------------------------------------------------------------

export const ListUserAppRoleAssignmentsInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
    top: topSchema(MAX_PAGE_SIZE),
    nextLink: NextLinkSchema,
  })
);
export type ListUserAppRoleAssignmentsInput = z.infer<typeof ListUserAppRoleAssignmentsInputSchema>;

export const RevokeUserAppAssignmentInputSchema = lazySchema(() =>
  z
    .object({
      userId: UserIdSchema,
      appRoleAssignmentId: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/, 'Must be an assignment id')
        .optional()
        .describe('Assignment id from listUserAppRoleAssignments'),
      resourceId: z
        .string()
        .trim()
        .max(GUID_LENGTH)
        .regex(GUID_PATTERN, 'Must be a service principal object id (GUID)')
        .optional()
        .describe("Application's service principal id; removes every assignment of the user to it"),
    })
    .refine((v) => (v.appRoleAssignmentId === undefined) !== (v.resourceId === undefined), {
      message: 'Give exactly one of appRoleAssignmentId or resourceId',
    })
);
export type RevokeUserAppAssignmentInput = z.infer<typeof RevokeUserAppAssignmentInputSchema>;

// ---------------------------------------------------------------------------
// Raw request
// ---------------------------------------------------------------------------

export const RequestInputSchema = lazySchema(() =>
  z
    .object({
      method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).describe('HTTP method'),
      path: z
        .string()
        .max(MAX_RAW_PATH_LENGTH)
        .refine(isAllowedRawPath, {
          message:
            "Must be a relative Graph path starting with '/', without the version, '//' or '..'",
        })
        .describe('Graph path without the version, for example /users/{id}/authentication/methods'),
      query: z
        .record(
          z.string().max(64),
          z.union([z.string().max(MAX_ODATA_EXPRESSION_LENGTH * 4), z.number(), z.boolean()])
        )
        .refine((v) => Object.keys(v).length <= MAX_RAW_QUERY_ENTRIES, {
          message: `At most ${MAX_RAW_QUERY_ENTRIES} query parameters`,
        })
        .optional()
        .describe('Query parameters, for example {"$select": "id,displayName"}'),
      body: z
        .record(z.string().max(256), z.unknown())
        .refine((v) => jsonByteLength(v) <= MAX_JSON_BODY_BYTES, {
          message: `body must serialize to at most ${MAX_JSON_BODY_BYTES} bytes`,
        })
        .optional()
        .describe('JSON body for POST, PATCH and PUT'),
    })
    .refine((v) => v.body === undefined || ['POST', 'PATCH', 'PUT'].includes(v.method), {
      message: 'body is only sent with POST, PATCH and PUT',
    })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;
