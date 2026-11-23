/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** Accounts page size: the API defaults to 50 and accepts at most 1000. */
export const ACCOUNTS_DEFAULT_LIMIT = 50;
/** Safe members page size: the API defaults to 25; 1000 is this connector's cap, matching accounts. */
export const MEMBERS_DEFAULT_LIMIT = 25;
export const MAX_PAGE_SIZE = 1000;
/** Upper bound on offset: far above any realistic vault, it only stops absurd values. */
const MAX_OFFSET = 10_000_000;
/** Vault safe names are at most 28 characters. */
export const SAFE_NAME_MAX = 28;
/** JSON Patch operations per updateAccount call. The vendor documents no maximum; this is the connector's own cap. */
export const MAX_PATCH_OPERATIONS = 50;
/** Platform account properties per addAccount call. No vendor maximum is documented; well above any platform. */
export const MAX_PLATFORM_PROPERTIES = 50;

/** Vault account IDs are two numbers joined by an underscore, for example 12_3; the length is capped by AccountIdSchema. */
const ACCOUNT_ID_PATTERN = /^\d+_\d+$/;
/**
 * Safe names cannot contain \ / : * < > " . | ? % & + (vault naming rules). Excluding them, and
 * control characters, also keeps a safe name from breaking out of the `safeName eq ...` filter.
 */
const SAFE_NAME_PATTERN = /^[^\\/:*<>".|?%&+\u0000-\u001f]+$/;
const SAFE_NAME_MESSAGE =
  'Safe names cannot contain \\ / : * < > " . | ? % & + or control characters.';
/** Safe member names cannot contain \ / : * < > " | ? % & + (vault naming rules). */
const MEMBER_NAME_PATTERN = /^[^\\/:*<>"|?%&+\u0000-\u001f]+$/;
const MEMBER_NAME_MESSAGE =
  'Member names cannot contain \\ / : * < > " | ? % & + or control characters.';
/** Account object names cannot contain \ / : * ? " < > | or control characters such as a tab. */
const ACCOUNT_NAME_PATTERN = /^[^\\/:*?"<>|\u0000-\u001f]+$/;
/** An SSH private key is far longer than a password; no vendor maximum is documented. */
export const SECRET_MAX = 16_384;
/** Platform IDs are letters, digits, underscores, hyphens and dots, for example WinServerLocal. */
const PLATFORM_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;
/** Paths updateAccount may replace. */
const PATCH_PATH_PATTERN =
  /^\/(address|name|platformId|userName|platformAccountProperties\/[A-Za-z0-9_-]{1,100})$/;

const AccountIdSchema = lazySchema(() =>
  z
    .string()
    .max(64)
    .regex(ACCOUNT_ID_PATTERN, 'Account ID must look like 12_3 (two numbers joined by "_").')
    .describe(
      'Vault account ID, two numbers joined by an underscore (for example "12_3"), as returned in the `id` field by listAccounts.'
    )
);

const SafeNameSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .min(1)
    .max(SAFE_NAME_MAX)
    .regex(SAFE_NAME_PATTERN, SAFE_NAME_MESSAGE)
    .describe(
      'Safe name (its URL ID), for example "SOC-Servers", as returned in `safeName` by listAccounts or getAccountDetails.'
    )
);

const PlatformIdSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(PLATFORM_ID_PATTERN, 'Platform IDs contain only letters, digits, "_", "-" and ".".')
);

const OffsetSchema = lazySchema(() =>
  z
    .number()
    .int()
    .min(0)
    .max(MAX_OFFSET)
    .optional()
    .describe(
      'Index of the first result (default 0). To read the next page, pass the `nextOffset` value from the previous result.'
    )
);

const UserIdSchema = lazySchema(() =>
  z
    .number()
    .int()
    .positive()
    .max(2_147_483_647)
    .describe('Numeric vault user ID, for example 42 (the ID of a Privilege Cloud vault user).')
);

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const ListAccountsInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Space-separated keywords matched against account name, address and user name, for example "svc-backup 10.0.0.5". Take them from the alert (user name, host address).'
      ),
    searchType: z
      .enum(['contains', 'startswith'])
      .optional()
      .describe('How keywords match: "contains" (vendor default) or "startswith".'),
    safeName: SafeNameSchema.optional().describe(
      'Only accounts in this safe, for example "SOC-Servers". Sent as the filter condition safeName eq <value>.'
    ),
    platformId: PlatformIdSchema.optional().describe(
      'Only accounts managed by this platform, for example "WinServerLocal" or "UnixSSH". Sent as the filter condition platformId eq <value>.'
    ),
    filter: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Raw filter expression, for example "modificationTime gte 1700000000". Joined with AND to the safeName and platformId conditions.'
      ),
    savedFilter: z
      .string()
      .max(50)
      .regex(/^[A-Za-z]+$/, 'Saved filter names contain only letters.')
      .optional()
      .describe(
        'Name of a vault preset filter, for example "Recently", "Locked" or "FailedChange". Passed through as savedfilter.'
      ),
    sort: z
      .string()
      .max(100)
      .optional()
      .describe('Property and direction, for example "userName asc" or "address desc".'),
    offset: OffsetSchema,
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .optional()
      .describe(`Page size, 1 to ${MAX_PAGE_SIZE} (default ${ACCOUNTS_DEFAULT_LIMIT}).`),
  })
);
export type ListAccountsInput = z.infer<typeof ListAccountsInputSchema>;

export const AccountIdInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
  })
);
export type AccountIdInput = z.infer<typeof AccountIdInputSchema>;

export const ChangeAccountPasswordInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
    changeEntireGroup: z
      .boolean()
      .optional()
      .describe(
        'Only matters for an account in an account group. The vendor default (when omitted) is true: every account in the group changes. Set false to change only this account.'
      ),
  })
);
export type ChangeAccountPasswordInput = z.infer<typeof ChangeAccountPasswordInputSchema>;

export const SetAccountPasswordInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
    newCredentials: z
      .string()
      .min(1)
      .max(128)
      .describe(
        'The new password, at most 128 characters, meeting the platform password policy. A secret: take it from a secret store, never from alert data. It is saved with the tool call and never returned.'
      ),
    changeImmediately: z
      .boolean()
      .optional()
      .describe(
        'true: the CPM changes the password on the target now; false: at the next scheduled change. Omit to use the vault default.'
      ),
  })
);
export type SetAccountPasswordInput = z.infer<typeof SetAccountPasswordInputSchema>;

const PlatformAccountPropertiesSchema = lazySchema(() =>
  z
    .record(z.string().min(1).max(100), z.string().max(1000))
    .refine((value) => Object.keys(value).length <= MAX_PLATFORM_PROPERTIES, {
      message: `At most ${MAX_PLATFORM_PROPERTIES} platform account properties.`,
    })
);

export const AddAccountInputSchema = lazySchema(() =>
  z.object({
    safeName: z
      .string()
      .trim()
      .min(1)
      .max(SAFE_NAME_MAX)
      .regex(SAFE_NAME_PATTERN, SAFE_NAME_MESSAGE)
      .describe(
        `Safe to store the account in, at most ${SAFE_NAME_MAX} characters, for example "SOC-Servers".`
      ),
    platformId: PlatformIdSchema.describe(
      'Platform that manages the account, for example "WinServerLocal" or "UnixSSH".'
    ),
    address: z
      .string()
      .max(255)
      .optional()
      .describe('Address of the target system, for example "10.0.0.5" or "db01.corp.example.com".'),
    userName: z
      .string()
      .max(128)
      .optional()
      .describe('User name of the account on the target, for example "svc-backup".'),
    name: z
      .string()
      .max(128)
      .regex(
        ACCOUNT_NAME_PATTERN,
        'Account names cannot contain \\ / : * ? " < > | or control characters such as a tab.'
      )
      .optional()
      .describe('Account object name in the vault. The vault generates one when omitted.'),
    secretType: z
      .enum(['password', 'key'])
      .optional()
      .describe('Credential type: "password" or "key" (an SSH key).'),
    secret: z
      .string()
      .max(SECRET_MAX)
      .optional()
      .describe(
        'Initial credential: a password, or an SSH private key when secretType is "key". A secret: take it from a secret store, never from alert data. It is saved with the tool call and never returned.'
      ),
    platformAccountProperties: PlatformAccountPropertiesSchema.optional().describe(
      `Platform-defined properties as string values, for example {"LogonDomain": "corp"}; at most ${MAX_PLATFORM_PROPERTIES}.`
    ),
    secretManagement: z
      .object({
        automaticManagementEnabled: z
          .boolean()
          .optional()
          .describe('Whether the CPM manages (rotates) the credential automatically.'),
        manualManagementReason: z
          .string()
          .max(255)
          .optional()
          .describe('Why automatic management is off, at most 255 characters.'),
      })
      .strict()
      .optional()
      .describe('CPM management settings for the new account.'),
  })
);
export type AddAccountInput = z.infer<typeof AddAccountInputSchema>;

export const UpdateAccountInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
    operations: z
      .array(
        z
          .object({
            op: z
              .literal('replace')
              .describe('Always "replace": the connector only replaces existing values.'),
            path: z
              .string()
              .max(150)
              .regex(
                PATCH_PATH_PATTERN,
                'path must be /address, /name, /platformId, /userName or /platformAccountProperties/<key>.'
              )
              .describe(
                'Property to replace: "/address", "/name", "/platformId", "/userName", or "/platformAccountProperties/<key>" (for example "/platformAccountProperties/LogonDomain").'
              ),
            value: z.string().max(1000).describe('New value for the property.'),
          })
          .strict()
      )
      .min(1)
      .max(MAX_PATCH_OPERATIONS)
      .describe(
        `JSON Patch replace operations, 1 to ${MAX_PATCH_OPERATIONS}, for example [{"op": "replace", "path": "/address", "value": "10.0.0.6"}].`
      ),
  })
);
export type UpdateAccountInput = z.infer<typeof UpdateAccountInputSchema>;

// ---------------------------------------------------------------------------
// Safe members
// ---------------------------------------------------------------------------

export const ListSafeMembersInputSchema = lazySchema(() =>
  z.object({
    safeName: SafeNameSchema,
    search: z.string().max(200).optional().describe('Member name keywords, for example "jsmith".'),
    filter: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter expression, for example "memberType eq User" or "membershipExpired eq false".'
      ),
    sort: z
      .string()
      .max(100)
      .optional()
      .describe('Property and direction, for example "memberName asc".'),
    offset: OffsetSchema,
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .optional()
      .describe(`Page size, 1 to ${MAX_PAGE_SIZE} (vendor default ${MEMBERS_DEFAULT_LIMIT}).`),
  })
);
export type ListSafeMembersInput = z.infer<typeof ListSafeMembersInputSchema>;

/** Safe member permissions, as the Safes API names them, with what each one allows. */
const SAFE_MEMBER_PERMISSION_DESCRIPTIONS = {
  useAccounts: 'Use accounts: connect to targets with the credential, without seeing it.',
  retrieveAccounts: 'Retrieve accounts: view or copy the credential.',
  listAccounts: 'List accounts: see the accounts in the safe.',
  addAccounts: 'Add accounts to the safe.',
  updateAccountContent: 'Update account content: change the stored credential.',
  updateAccountProperties: 'Update account properties.',
  initiateCPMAccountManagementOperations:
    'Initiate CPM account management operations: change, verify and reconcile.',
  specifyNextAccountContent: 'Specify next account content: set the next password.',
  renameAccounts: 'Rename accounts.',
  deleteAccounts: 'Delete accounts.',
  unlockAccounts: 'Unlock accounts.',
  manageSafe: 'Manage safe properties.',
  manageSafeMembers: 'Manage safe members: add, change and remove members.',
  backupSafe: 'Back up the safe.',
  viewAuditLog: 'View audit log of the safe and its accounts.',
  viewSafeMembers: 'View safe members.',
  accessWithoutConfirmation: 'Access accounts without dual-control confirmation.',
  createFolders: 'Create folders.',
  deleteFolders: 'Delete folders.',
  moveAccountsAndFolders: 'Move accounts and folders.',
  requestsAuthorizationLevel1: 'Confirm access requests at authorization level 1.',
  requestsAuthorizationLevel2: 'Confirm access requests at authorization level 2.',
} as const;

export const SAFE_MEMBER_PERMISSIONS = Object.keys(SAFE_MEMBER_PERMISSION_DESCRIPTIONS) as Array<
  keyof typeof SAFE_MEMBER_PERMISSION_DESCRIPTIONS
>;

const SafeMemberPermissionsSchema = lazySchema(() =>
  z
    .object(
      Object.fromEntries(
        Object.entries(SAFE_MEMBER_PERMISSION_DESCRIPTIONS).map(([name, description]) => [
          name,
          z.boolean().optional().describe(description),
        ])
      ) as Record<keyof typeof SAFE_MEMBER_PERMISSION_DESCRIPTIONS, z.ZodOptional<z.ZodBoolean>>
    )
    .strict()
);

export const AddSafeMemberInputSchema = lazySchema(() =>
  z.object({
    safeName: SafeNameSchema,
    memberName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(MEMBER_NAME_PATTERN, MEMBER_NAME_MESSAGE)
      .describe(
        'Existing vault or directory user, group or role to add, for example "jsmith" or "jsmith@corp.example.com".'
      ),
    memberType: z
      .enum(['User', 'Group', 'Role'])
      .describe('Member type: "User", "Group" or "Role".'),
    searchIn: z
      .string()
      .max(100)
      .optional()
      .describe(
        'Where to look the member up: "Vault" (vendor default) for vault users, or the ID (UUID) of the Identity directory for Identity Administration users and groups; with "Vault", adding an Identity user fails.'
      ),
    membershipExpirationDate: z
      .number()
      .int()
      .positive()
      .max(32_503_680_000)
      .refine((value) => value * 1000 > Date.now(), {
        message: 'membershipExpirationDate must be in the future (epoch seconds).',
      })
      .optional()
      .describe(
        'Epoch seconds when the membership ends, for example 1767225600; must be in the future. The vault then removes the access by itself, which suits just-in-time grants.'
      ),
    permissions: SafeMemberPermissionsSchema.describe(
      `Permissions to grant, as booleans; unknown keys are rejected. Accepted keys: ${SAFE_MEMBER_PERMISSIONS.join(
        ', '
      )}. Example for read-only access: {"listAccounts": true, "useAccounts": true, "retrieveAccounts": true}.`
    ),
  })
);
export type AddSafeMemberInput = z.infer<typeof AddSafeMemberInputSchema>;

export const RemoveSafeMemberInputSchema = lazySchema(() =>
  z.object({
    safeName: SafeNameSchema,
    memberName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(MEMBER_NAME_PATTERN, MEMBER_NAME_MESSAGE)
      .describe(
        'Member to remove, exactly as listed in `memberName` by listSafeMembers, for example "jsmith".'
      ),
  })
);
export type RemoveSafeMemberInput = z.infer<typeof RemoveSafeMemberInputSchema>;

// ---------------------------------------------------------------------------
// Vault users
// ---------------------------------------------------------------------------

export const UserIdInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
  })
);
export type UserIdInput = z.infer<typeof UserIdInputSchema>;
