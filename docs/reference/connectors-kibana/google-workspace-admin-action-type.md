---
navigation_title: "Google Workspace Admin"
type: reference
description: "Use the Google Workspace Admin connector in Agent Builder to search audit logs, look up users and OAuth grants, and review groups, admin roles, and devices."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Google Workspace Admin connector [google-workspace-admin-action-type]

The Google Workspace Admin connector lets AI agents in **Agent Builder** query the Google Admin SDK Directory API and Reports API, so they can investigate a Google Workspace account without opening the Google Admin console. Use it to triage suspicious sign-ins, review the third-party apps a user has authorized, or check who holds admin roles. Agents can:

- Read audit events, such as sign-ins, admin changes, and OAuth grants
- Look up users and their third-party app grants, app passwords, and 2-Step Verification backup codes
- Review group memberships, admin role assignments, and managed mobile devices

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Overview [google-workspace-admin-overview]

The connector calls the Admin SDK as a Google Workspace administrator. Either a Workspace administrator authorizes the connector through OAuth 2.0 or you enter an administrator's OAuth 2.0 access token. Every action needs both an OAuth scope and an administrator privilege for that kind of data. In {{kib}}, you need an Enterprise license.

## Create connectors in {{kib}} [define-google-workspace-admin-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-workspace-admin-connector-configuration]

Google Workspace Admin connectors have no URL setting: Google has one Admin SDK host, so the connector always calls `https://admin.googleapis.com`. They have the following configuration properties:

Authentication
:   Select one of the following:
    - **OAuth 2.0 authorization code** (recommended): Enter the **Client ID** and **Client secret** of an OAuth web application client, then authorize the connector as a Workspace administrator. The connector requests the scopes listed in [Required permissions](#google-workspace-admin-required-permissions) and refreshes the access token automatically.
    - **Bearer token**: Enter an OAuth 2.0 access token of a Workspace administrator with the scopes listed in [Required permissions](#google-workspace-admin-required-permissions). Google access tokens expire after about one hour, so the connector stops working until you enter a new token. Use this option for short tests.

### Required permissions [google-workspace-admin-required-permissions]

The connector requests these OAuth scopes:

- `https://www.googleapis.com/auth/admin.directory.user`
- `https://www.googleapis.com/auth/admin.directory.user.security`
- `https://www.googleapis.com/auth/admin.directory.group`
- `https://www.googleapis.com/auth/admin.directory.group.member`
- `https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly`
- `https://www.googleapis.com/auth/admin.directory.device.mobile.action`
- `https://www.googleapis.com/auth/admin.reports.audit.readonly`

The administrator who authorizes the connector, or whose token you enter, also needs the admin privileges of the actions you use. A super administrator has all of them.

| OAuth scope | Admin privilege | Required for |
| --- | --- | --- |
| `admin.reports.audit.readonly` | Reports | `listActivities` |
| `admin.directory.user` | Users: Read | `listUsers`, `getUser` |
| `admin.directory.user` | Users: Update | `suspendUser`, `unsuspendUser`, `updateUser` |
| `admin.directory.user.security` | Users: Manage user security | `signOutUser`, `listUserTokens`, `revokeUserToken`, `listAppPasswords`, `revokeAppPasswords`, `listVerificationCodes`, `invalidateVerificationCodes` |
| `admin.directory.group`, `admin.directory.group.member` | Groups: Read | `listGroups`, `listGroupMembers` |
| `admin.directory.group`, `admin.directory.group.member` | Groups: Update | `addGroupMember`, `removeGroupMember` |
| `admin.directory.rolemanagement.readonly` | Admin roles: Read | `listRoleAssignments` |
| `admin.directory.device.mobile.action` | Services: Mobile device management: Manage devices and settings | `listMobileDevices`, `actionMobileDevice` |

A missing scope or privilege makes the action fail with HTTP 403 and a message that says so.

## Test connectors [google-workspace-admin-action-configuration]

**Test connector** reads one user of the account. It checks the access token, the `admin.directory.user` scope, and the administrator's privilege to read users.

## Connector actions [google-workspace-admin-connector-actions]

Actions identify a user by `userKey`: the primary email, an alias email, or the unique user ID. They identify a group by `groupKey`: the group email, an alias, or the group ID. `customer` and `customerId` default to `my_customer`, the account of the authorized administrator.

Every list action except `listUserTokens`, `listAppPasswords`, and `listVerificationCodes` returns one page and `nextPageToken` when more results exist. To read the next page, call the action again with the same filters and `pageToken` set to that value.

### Audit events [google-workspace-admin-audit]

`listActivities`
:   List audit events of one application, optionally narrowed to one user, actor IP address, event name, event-parameter filter, or time range. Returns `items` and `nextPageToken`.
    - `applicationName` (required): The application, for example `login`, `admin`, `token`, `user_accounts`, `drive`, `mobile`, or `saml`. Also accepted (every application of the Google Reports API, lowercase as listed): `access_transparency`, `calendar`, `chat`, `gcp`, `gmail`, `gplus`, `groups`, `groups_enterprise`, `jamboard`, `meet`, `rules`, `context_aware_access`, `chrome`, `data_studio`, `keep`, `vault`, `gemini_in_workspace_apps`, `classroom`, `assignments`, `cloud_search`, `tasks`, `data_migration`, `meet_hardware`, `directory_sync`, `ldap`, `profile`, `access_evaluation`, `admin_data_action`, `contacts`, `takeout`, `graduation`, `voice`, `chrome_sync`, `workspace_studio`, and `gemini_notebook`.
    - `userKey` (optional): The primary email or user ID of one user. Defaults to `all`.
    - `startTime`, `endTime` (optional): The time range in RFC 3339 format, for example `2026-11-01T00:00:00Z`.
    - `eventName` (optional): An event name, for example `login_failure`.
    - `filters` (optional): Comma-separated event-parameter conditions with `==`, `<>`, `<`, `<=`, `>`, or `>=`, for example `login_type==exchange`.
    - `actorIpAddress` (optional): The IP address of the user who performed the action.
    - `maxResults` (optional): Page size, 1–1,000. Defaults to 100.
    - `pageToken` (optional): `nextPageToken` from the previous page.

### Users [google-workspace-admin-users]

`listUsers`
:   Search directory users. Returns `nextPageToken` and `users`, each with `id`, `primaryEmail`, `fullName`, `suspended`, `suspensionReason`, `archived`, `orgUnitPath`, `isAdmin`, `isDelegatedAdmin`, `isEnrolledIn2Sv`, `isEnforcedIn2Sv`, `lastLoginTime`, and `creationTime`.
    - `customer` (optional): The customer ID, or `my_customer`. Used when `domain` isn't set.
    - `domain` (optional): Only users of this domain.
    - `query` (optional): A user search query, for example `isSuspended=true` or `orgUnitPath=/Sales`. `lastLoginTime` isn't a search field, and Google rejects a query that uses it with HTTP 400. To find users by last sign-in, filter the returned `lastLoginTime` values.
    - `orderBy` (optional): `email`, `familyName`, or `givenName`.
    - `maxResults` (optional): Page size, 1–500. Defaults to 100.
    - `pageToken` (optional): `nextPageToken` from the previous page.

`getUser`
:   Get the full directory record of one user, including suspension status and reason, organizational unit, 2-step verification enrollment and enforcement, last sign-in time, admin flags, and recovery email and phone.
    - `userKey` (required): The user.
    - `projection` (optional): `basic` (default) or `full`. `full` adds custom schema fields.
    - `viewType` (optional): `admin_view` (default) or `domain_public`.

`suspendUser` _(not yet available)_
:   Suspend a user account so it can no longer sign in. A user who is already suspended stays suspended, and the call succeeds. Returns `id`, `primaryEmail`, `suspended`, and `suspensionReason`.
    - `userKey` (required): The user.

`unsuspendUser` _(not yet available)_
:   Restore a suspended user account so it can sign in again. A user who isn't suspended stays active, and the call succeeds. Returns `id`, `primaryEmail`, and `suspended`.
    - `userKey` (required): The user.

`signOutUser` _(not yet available)_
:   Sign a user out of all web and device sessions. The account stays active, so the user can sign in again; suspend the account to block that. The call also succeeds when the user has no active session. Returns `userKey` and `signedOut: true`.
    - `userKey` (required): The user.

`updateUser` _(not yet available)_
:   Update selected fields of a user. Only the fields you set change; set at least one. Returns `id`, `primaryEmail`, `orgUnitPath`, `changePasswordAtNextLogin`, `recoveryEmail`, and `recoveryPhone` as Google's answer contains them, with `null` for a field that the answer leaves out, and `updatedFields`, the fields that were sent.
    - `userKey` (required): The user.
    - `orgUnitPath` (optional): The full organizational unit path, starting with `/`, for example `/Quarantine`.
    - `changePasswordAtNextLogin` (optional): Whether the user must change the password at the next sign-in.
    - `recoveryEmail` (optional): The recovery email address.
    - `recoveryPhone` (optional): The recovery phone in E.164 format, for example `+16505550100`.

### Account security [google-workspace-admin-security]

`listUserTokens`
:   List the third-party apps a user granted OAuth access to. Returns `items`, each with `clientId`, `displayText`, and `scopes`.
    - `userKey` (required): The user.

`revokeUserToken` _(not yet available)_
:   Revoke a user's OAuth grant for one app, cutting that app's access to the account. Returns `userKey`, `clientId`, and `status`: `revoked`, or `notFound` when Google reports no grant for that client ID. The action fails when the user doesn't exist. Google also accepts a client ID that the user never granted, so `revoked` doesn't prove that a grant existed. To check, call `listUserTokens` before revoking.
    - `userKey` (required): The user.
    - `clientId` (required): The app's OAuth client ID, from `listUserTokens`.

`listAppPasswords`
:   List a user's app passwords. Returns `items`, each with `codeId`, `name`, `creationTime`, and `lastTimeUsed`.
    - `userKey` (required): The user.

`revokeAppPasswords` _(not yet available)_
:   Delete one app password, so apps that use it can no longer sign in. Returns `userKey`, `codeId`, and `status`: `revoked`, or `notFound` when the user has no app password with that code ID. Google rejects an unknown code ID with HTTP 400; the connector then reads the user's app passwords and returns `notFound` when the code ID isn't among them. The action fails when the user doesn't exist.
    - `userKey` (required): The user.
    - `codeId` (required): The app password's code ID, from `listAppPasswords`.

`listVerificationCodes`
:   Count the 2-step verification backup codes that are valid for a user. Returns `count` and one entry with `userId` per code. The action never returns the code values.
    - `userKey` (required): The user.

`invalidateVerificationCodes` _(not yet available)_
:   Invalidate all current 2-step verification backup codes of a user, for example, when they might be exposed. The user needs new codes afterward. Returns `userKey` and `invalidated: true`, also when the user had no valid codes. Google rejects that case with HTTP 400, for example on a repeat call; the connector then reads the user's codes and succeeds when none is valid.
    - `userKey` (required): The user.

### Groups [google-workspace-admin-groups]

`listGroups`
:   List groups of the account or of one domain, or only the groups a user belongs to. Returns `nextPageToken` and `groups`, each with `id`, `email`, `name`, `description`, and `directMembersCount`.
    - `userKey` (optional): Only the groups this user or group is a member of. Can't be combined with `customer` or `query`.
    - `customer` (optional): The customer ID, or `my_customer`. Used when neither `userKey` nor `domain` is set.
    - `domain` (optional): Only groups of this domain.
    - `query` (optional): A group search query, for example `email:admins*`. Can't be combined with `userKey`.
    - `maxResults` (optional): Page size, 1–200. Defaults to 100.
    - `pageToken` (optional): `nextPageToken` from the previous page.

`listGroupMembers`
:   List members of a group with `email`, `role`, `type`, and `status`. Returns `members` and `nextPageToken`.
    - `groupKey` (required): The group.
    - `roles` (optional): Only members with these roles: `OWNER`, `MANAGER`, `MEMBER`.
    - `includeDerivedMembership` (optional): Include members of nested groups. Defaults to `false`.
    - `maxResults` (optional): Page size, 1–200. Defaults to 100.
    - `pageToken` (optional): `nextPageToken` from the previous page.

`addGroupMember` _(not yet available)_
:   Add a user or group to a group. Returns `groupKey`, `email`, `role`, `requestedRole`, `id`, `type`, and `status`: `added`, or `alreadyMember` when the email is already a member. An existing member keeps their role, so `requestedRole` isn't applied, and `id`, `role`, and `type` are then `null`. To read the current role, use `listGroupMembers`.
    - `groupKey` (required): The group.
    - `email` (required): The email of the user or group to add.
    - `role` (optional): `MEMBER` (default), `MANAGER`, or `OWNER`.

`removeGroupMember` _(not yet available)_
:   Remove a user or group from a group. Returns `groupKey`, `memberKey`, and `status`: `removed`, or `notMember` when it isn't a member. The action fails when the group doesn't exist.
    - `groupKey` (required): The group.
    - `memberKey` (required): The email, alias, or ID of the member to remove.

### Admin roles [google-workspace-admin-roles]

`listRoleAssignments`
:   List admin role assignments, optionally for one user or one role. Returns `nextPageToken` and `items`, each with `roleAssignmentId`, `roleId`, `assignedTo`, `assigneeType`, `scopeType`, and `orgUnitId`.
    - `customer` (optional): The customer ID, or `my_customer` (default).
    - `userKey` (optional): Only the assignments of this user. Can't be combined with `roleId`. A `userKey` that isn't a user of the account fails with a message that says so.
    - `roleId` (optional): Only the assignments of this numeric role ID. Can't be combined with `userKey`.
    - `includeIndirectRoleAssignments` (optional): Include roles held through groups. Requires `userKey`.
    - `maxResults` (optional): Page size, 1–200. Defaults to 100.
    - `pageToken` (optional): `nextPageToken` from the previous page.

### Mobile devices [google-workspace-admin-devices]

`listMobileDevices`
:   List managed mobile devices. Returns `nextPageToken` and `mobiledevices`, each with `resourceId`, `deviceId`, `email`, `name`, `model`, `os`, `type`, `status`, `lastSync`, and `firstSync`.
    - `customerId` (optional): The customer ID, or `my_customer` (default).
    - `query` (optional): A mobile device search query, for example `email:user@example.com`.
    - `orderBy` (optional): `deviceId`, `email`, `lastSync`, `model`, `name`, `os`, `status`, or `type`.
    - `sortOrder` (optional): `ASCENDING` or `DESCENDING`. Requires `orderBy`.
    - `maxResults` (optional): Page size, 1–100. Defaults to 100.
    - `pageToken` (optional): `nextPageToken` from the previous page.

`actionMobileDevice` _(not yet available)_
:   Apply an action to a managed mobile device. A wipe can't be undone. Returns `resourceId`, `action`, and `status: requested`.
    - `customerId` (optional): The customer ID, or `my_customer` (default).
    - `resourceId` (required): The device's `resourceId`, from `listMobileDevices`.
    - `action` (required): `block`, `wipe`, or `account_wipe`.

## Usage notes [google-workspace-admin-usage-notes]

- The connector sends every request to `https://admin.googleapis.com` and doesn't retry failed calls. An error keeps the HTTP status and, on a rate limit, Google's `Retry-After` value, so you can decide when to run the action again.
- Google answers a malformed or outdated `pageToken` with HTTP 503 instead of HTTP 400. The error then asks you to check `pageToken`. Pass the `nextPageToken` of the previous page of the same request.
- After a server error or a timeout, a change might already be applied, so read the current state before you run an action that changes data again.
- Each request times out after 30 seconds.
- A response larger than `xpack.actions.maxResponseContentLength` (1 MB by default) fails with an error that says so. Request a smaller page with `maxResults`, narrow the query, or raise the setting.

## Connector networking configuration [google-workspace-admin-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

If you restrict `xpack.actions.allowedHosts`, allow `admin.googleapis.com` for the actions and `oauth2.googleapis.com` for the OAuth token exchange.

## Get API credentials [google-workspace-admin-api-credentials]

### OAuth 2.0 authorization code [google-workspace-admin-oauth]

1. In the [Google Cloud Console](https://console.cloud.google.com/), select or create a project. Select **APIs & Services → Library** and enable the **Admin SDK API**.
2. Select **APIs & Services → OAuth consent screen** and enter the app name and support email. For a client used only inside your organization, select the **Internal** user type.
3. Select **APIs & Services → Credentials** and create an OAuth client ID of type **Web application**. Under **Authorized redirect URIs**, add the {{kib}} connector OAuth callback. Copy the exact URI from the {{kib}} connector creation form, or use this pattern with your public {{kib}} host and any configured `server.basePath`:

   ```text
   https://<your-kibana-host>/api/actions/connector/_oauth_callback
   ```

4. Copy the **Client ID** and **Client secret**.
5. In {{kib}}, create the connector and select **OAuth 2.0 authorization code**. In the **Client ID** and **Client secret** fields, enter the values you copied.
6. Authorize the connector while signed in as a Workspace administrator who has the admin privileges listed in [Required permissions](#google-workspace-admin-required-permissions). Google asks the administrator to grant these scopes:
   - `https://www.googleapis.com/auth/admin.directory.user`
   - `https://www.googleapis.com/auth/admin.directory.user.security`
   - `https://www.googleapis.com/auth/admin.directory.group`
   - `https://www.googleapis.com/auth/admin.directory.group.member`
   - `https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly`
   - `https://www.googleapis.com/auth/admin.directory.device.mobile.action`
   - `https://www.googleapis.com/auth/admin.reports.audit.readonly`

### Bearer token [google-workspace-admin-bearer]

For a short test, you can enter an OAuth 2.0 access token of a Workspace administrator instead, for example one issued in the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) for the scopes listed in [Required permissions](#google-workspace-admin-required-permissions). The token expires after about one hour.
