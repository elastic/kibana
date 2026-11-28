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
/**
 * Activities getAccountActivity returns by default. The endpoint has no paging, so the connector
 * keeps the newest ones and keeps the result small enough for an agent.
 */
export const ACTIVITIES_DEFAULT_LIMIT = 100;
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
 * Safe names cannot contain \ / : * < > " . | ? % & + (vault naming rules); control characters are
 * refused too. A name with spaces can still add conditions to the `safeName eq ...` filter of
 * listAccounts, which allows nothing that the raw filter input does not already allow.
 */
const SAFE_NAME_PATTERN = /^[^\\/:*<>".|?%&+\u0000-\u001f]+$/;
const SAFE_NAME_MESSAGE =
  'Safe names cannot contain \\ / : * < > " . | ? % & + or control characters.';
/** Safe member names cannot contain \ / : * < > " | ? % & + (vault naming rules). */
const MEMBER_NAME_PATTERN = /^[^\\/:*<>"|?%&+\u0000-\u001f]+$/;
const MEMBER_NAME_MESSAGE =
  'Member names cannot contain \\ / : * < > " | ? % & + or control characters.';
/** "." and ".." are dot segments: in a URL path they would move the request to another route. */
const isNotDotSegment = (value: string) => value !== '.' && value !== '..';
const DOT_SEGMENT_MESSAGE = 'Member names cannot be "." or "..".';
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

/** The saved filters the Get accounts API documents for savedfilter. */
export const ACCOUNT_SAVED_FILTERS = [
  'Regular',
  'Recently',
  'New',
  'Link',
  'Deleted',
  'PolicyFailures',
  'AccessedByUsers',
  'ModifiedByUsers',
  'ModifiedByCPM',
  'DisabledPasswordByUser',
  'DisabledPasswordByCPM',
  'ScheduledForChange',
  'ScheduledForVerify',
  'ScheduledForReconcile',
  'SuccessfullyReconciled',
  'FailedChange',
  'FailedVerify',
  'FailedReconcile',
  'LockedOrNew',
  'Locked',
  'Favorites',
] as const;

/** The Get accounts API accepts up to eight fields and values in one search query. */
export const MAX_ACCOUNT_FILTER_CONDITIONS = 8;

export const MIXED_FILTER_OPERATORS_MESSAGE =
  'The account filter can use only AND operators or only OR operators, not both. safeName and platformId are joined to the filter with AND, so a filter that uses OR cannot be combined with them.';
export const TOO_MANY_FILTER_CONDITIONS_MESSAGE = `The account filter can have at most ${MAX_ACCOUNT_FILTER_CONDITIONS} conditions, counting safeName and platformId.`;

/**
 * The AND and OR operators of a filter expression: whole words in upper case, as the Get accounts
 * API writes them, so a lower-case "and" or "or" inside a value is not read as an operator.
 */
const filterOperators = (filter: string): string[] =>
  (filter.match(/\s(AND|OR)\s/g) ?? []).map((operator) => operator.trim());

export const ListAccountsInputSchema = lazySchema(() =>
  z
    .object({
      search: z
        .string()
        .trim()
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
        'Only accounts managed by this platform, for example "WinServerLocal" or "UnixSSH". Sent as the filter condition platformId eq <value> (platformId is one of the advanced search properties the filter accepts).'
      ),
      filter: z
        .string()
        .trim()
        .max(500)
        .optional()
        .describe(
          `Raw filter expression, for example "modificationTime gte 1700000000" or "userName contains admin AND address contains 10.0.0". Use only AND or only OR (in upper case) between conditions, at most ${MAX_ACCOUNT_FILTER_CONDITIONS} conditions in all. Joined with AND to the safeName and platformId conditions, so use OR only without them.`
        ),
      savedFilter: z
        .enum(ACCOUNT_SAVED_FILTERS)
        .optional()
        .describe(
          'A vault saved filter, sent as savedfilter, for example "Recently", "FailedChange", "ScheduledForChange" or "Locked" (Locked returns only accounts locked by the service user). Can be combined with search, filter, safeName and platformId.'
        ),
      sort: z
        .string()
        .trim()
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
    .superRefine((value, ctx) => {
      // Checked after trimming: a whitespace-only filter counts as not set.
      if (!value.filter) {
        return;
      }
      const operators = filterOperators(value.filter);
      const joinedWithAnd = Boolean(value.safeName || value.platformId);
      if (new Set(operators).size > 1 || (joinedWithAnd && operators.includes('OR'))) {
        ctx.addIssue({ code: 'custom', message: MIXED_FILTER_OPERATORS_MESSAGE, path: ['filter'] });
      }
      const conditions =
        operators.length + 1 + (value.safeName ? 1 : 0) + (value.platformId ? 1 : 0);
      if (conditions > MAX_ACCOUNT_FILTER_CONDITIONS) {
        ctx.addIssue({
          code: 'custom',
          message: TOO_MANY_FILTER_CONDITIONS_MESSAGE,
          path: ['filter'],
        });
      }
    })
);
export type ListAccountsInput = z.infer<typeof ListAccountsInputSchema>;

export const AccountIdInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
  })
);
export type AccountIdInput = z.infer<typeof AccountIdInputSchema>;

export const AccountActivityInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .optional()
      .describe(
        `Most activities to return, newest first, 1 to ${MAX_PAGE_SIZE} (default ${ACTIVITIES_DEFAULT_LIMIT}). Older activities beyond it are left out.`
      ),
  })
);
export type AccountActivityInput = z.infer<typeof AccountActivityInputSchema>;

export const ChangeAccountPasswordInputSchema = lazySchema(() =>
  z.object({
    accountId: AccountIdSchema,
    changeEntireGroup: z
      .boolean()
      .optional()
      .describe(
        'Only matters for an account in an account group. Defaults to false: only this account changes. The connector always sends the value, as both ChangeEntireGroup and ChangeCredsForGroup because the vendor docs use both names and the vendor default is true. Set true to change every account in the group.'
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
        'The new password, at most 128 characters, meeting the platform password policy. A secret: take it from a secret store, never from alert data. It is passed straight to Privilege Cloud and never stored, logged or returned by the connector.'
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
        'Initial credential: a password, or an SSH private key when secretType is "key". A secret: take it from a secret store, never from alert data. It is passed straight to Privilege Cloud and never stored, logged or returned by the connector.'
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
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe('Member name keywords, for example "jsmith".'),
    filter: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe(
        'Filter expression, for example "memberType eq User" or "membershipExpired eq false".'
      ),
    sort: z
      .string()
      .trim()
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
      .refine(isNotDotSegment, DOT_SEGMENT_MESSAGE)
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
      .refine(isNotDotSegment, DOT_SEGMENT_MESSAGE)
      .describe(
        'Member to remove, exactly as listed in `memberName` by listSafeMembers, for example "jsmith".'
      ),
  })
);
export type RemoveSafeMemberInput = z.infer<typeof RemoveSafeMemberInputSchema>;

// ---------------------------------------------------------------------------
// Privileged sessions
// ---------------------------------------------------------------------------

/** Live sessions page size: the API defaults to 25. */
export const LIVE_SESSIONS_DEFAULT_LIMIT = 25;
/** Live sessions sort: highest risk score first, so a risky session leads the page. */
export const LIVE_SESSIONS_DEFAULT_SORT = '-RiskScore';
/** Upper bound on a Unix time in seconds (year 3000): it only stops absurd values. */
const MAX_EPOCH_SECONDS = 32_503_680_000;

/** Properties the LiveSessions API sorts by; a leading "-" sorts in descending order. */
const LIVE_SESSION_SORT_FIELDS = [
  'RiskScore',
  'FileName',
  'SafeName',
  'FolderName',
  'PSMVaultUserName',
  'FromIP',
  'RemoteMachine',
  'Client',
  'Protocol',
  'AccountUserName',
  'AccountAddress',
  'AccountPlatformID',
  'PSMStartTime',
  'TicketID',
] as const;
export const LIVE_SESSION_SORTS = [
  ...LIVE_SESSION_SORT_FIELDS,
  ...LIVE_SESSION_SORT_FIELDS.map((field) => `-${field}` as const),
] as [string, ...string[]];

const EpochSecondsSchema = lazySchema(() => z.number().int().min(0).max(MAX_EPOCH_SECONDS));

export const ListRiskySessionsInputSchema = lazySchema(() =>
  z
    .object({
      fromTime: EpochSecondsSchema.optional().describe(
        'Only sessions started at or after this Unix time in seconds, for example 1767225600.'
      ),
      toTime: EpochSecondsSchema.optional().describe(
        'Only sessions started at or before this Unix time in seconds.'
      ),
      safeName: SafeNameSchema.optional().describe(
        'Only sessions that use an account in this safe, for example "SOC-Servers".'
      ),
      search: z
        .string()
        .trim()
        .max(500)
        .optional()
        .describe(
          'Keywords matched against session properties such as the account user name, target address or vault user, for example "svc-backup".'
        ),
      activities: z
        .string()
        .trim()
        .max(500)
        .optional()
        .describe('Only sessions with these recorded activities, as Privilege Cloud filters them.'),
      sort: z
        .enum(LIVE_SESSION_SORTS)
        .optional()
        .describe(
          `Property to sort by; a leading "-" sorts in descending order. Defaults to "${LIVE_SESSIONS_DEFAULT_SORT}" (highest risk score first). Other examples: "-PSMStartTime" (newest first), "AccountAddress".`
        ),
      offset: OffsetSchema,
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .optional()
        .describe(`Page size, 1 to ${MAX_PAGE_SIZE} (default ${LIVE_SESSIONS_DEFAULT_LIMIT}).`),
    })
    .refine(
      (value) =>
        value.fromTime === undefined ||
        value.toTime === undefined ||
        value.fromTime <= value.toTime,
      { message: 'fromTime must not be later than toTime.', path: ['fromTime'] }
    )
);
export type ListRiskySessionsInput = z.infer<typeof ListRiskySessionsInputSchema>;

// ---------------------------------------------------------------------------
// Vault users
// ---------------------------------------------------------------------------

/** Users page size of listUsers. The vendor SDK reads users in pages of 200; 100 keeps a page small for an agent. */
export const USERS_DEFAULT_LIMIT = 100;
/**
 * User names, user types and other values sent inside a `<property> eq <value>` filter cannot
 * contain control characters; a value with " AND " adds a condition, which allows nothing a
 * caller of the API could not already ask for.
 */
const FILTER_VALUE_PATTERN = /^[^\u0000-\u001f]+$/;

/** Properties the Get users API sorts by. */
export const USERS_SORT_FIELDS = [
  'username',
  'source',
  'userType',
  'location',
  'lastname',
  'firstname',
  'middlename',
] as const;
const USERS_SORT_TERM = `(?:${USERS_SORT_FIELDS.join('|')})(?:\\s+(?:asc|desc))?`;
/** One to three "<property> [asc|desc]" terms separated by commas. */
const USERS_SORT_PATTERN = new RegExp(
  `^${USERS_SORT_TERM}(?:\\s*,\\s*${USERS_SORT_TERM}){0,2}$`,
  'i'
);
const USERS_SORT_MESSAGE = `sort takes up to 3 of ${USERS_SORT_FIELDS.join(
  ', '
)}, separated by commas, each optionally followed by asc or desc.`;

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .trim()
      .max(500)
      .optional()
      .describe(
        'Keywords matched against the user name, first name and last name, for example "jsmith".'
      ),
    userName: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(FILTER_VALUE_PATTERN, 'User names cannot contain control characters.')
      .optional()
      .describe(
        'Exact vault user name, for example "jsmith@corp.example.com", sent as the filter condition userName eq <value>. Use it to turn the user name an alert carries into the numeric user ID.'
      ),
    userType: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[A-Za-z0-9_]+$/, 'User types contain only letters, digits and "_".')
      .optional()
      .describe('Only users of this type, for example "EPVUser". Sent as userType eq <value>.'),
    componentUser: z
      .boolean()
      .optional()
      .describe(
        'true: only component (application) users; false: only personal users. Sent as componentUser eq <value>.'
      ),
    sort: z
      .string()
      .trim()
      .max(200)
      .regex(USERS_SORT_PATTERN, USERS_SORT_MESSAGE)
      .optional()
      .describe(
        `Up to 3 properties, separated by commas, each optionally followed by asc (default) or desc, for example "lastname asc, firstname". Properties: ${USERS_SORT_FIELDS.join(
          ', '
        )}.`
      ),
    extendedDetails: z
      .boolean()
      .optional()
      .describe(
        'true also returns enabled, suspended (true after too many failed logons), groupsMembership and, for LDAP users, userDN. Sent as ExtendedDetails; the API default is false.'
      ),
    offset: OffsetSchema,
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .optional()
      .describe(`Page size, 1 to ${MAX_PAGE_SIZE} (default ${USERS_DEFAULT_LIMIT}).`),
  })
);
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const UserIdInputSchema = lazySchema(() =>
  z.object({
    userId: UserIdSchema,
  })
);
export type UserIdInput = z.infer<typeof UserIdInputSchema>;
