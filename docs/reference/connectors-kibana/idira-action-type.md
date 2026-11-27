---
navigation_title: "Idira Privilege Cloud"
type: reference
description: "Use the Idira Privilege Cloud (formerly CyberArk) connector to find privileged accounts and rotate, reconcile, or verify their credentials."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Idira Privilege Cloud connector [idira-action-type]

The connector for Idira Privilege Cloud (formerly CyberArk Privilege Cloud) uses the Privilege Cloud REST API so AI agents in **Agent Builder** can respond to a privileged-access incident without opening the Privilege Cloud portal. Agents can:

- Find privileged accounts and enrich an alert with their details and audit activity.
- Have the Central Policy Manager (CPM) rotate, reconcile, or verify a credential.
- Review who has access to a safe.
- Spot risky privileged sessions.

::::{note}
This connector is currently available in **Agent Builder** only. Actions marked _(API only)_ aren't exposed to agents. You can run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Overview [idira-overview]

The connector signs in as a Privilege Cloud service user. It requests an OAuth 2.0 access token from your Idira identity tenant with the service user's client credentials, and sends every API request to your tenant's Privilege Cloud address. The two addresses are different hosts: the token URL is on `id.cyberark.cloud`, and the Privilege Cloud URL is on `privilegecloud.cyberark.cloud`. In {{kib}}, you need an Enterprise license.

The connector doesn't support self-hosted Privileged Access Manager, Endpoint Privilege Manager, or Identity directory administration.

## Create connectors in {{kib}} [define-idira-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Get API credentials [idira-api-credentials]

The connector uses a service user that is an OAuth confidential client. To create one:

1. In Identity Administration, select **Core Services** → **Users** and add a user, for example `kibana-svc`.
2. Select **Is OAuth confidential client** and **Is service user**.
3. In the **Password** field, enter a strong password. The user name is the client ID and the password is the client secret.
4. Add the user to a role that gives it access to Privilege Cloud, for example **Privilege Cloud Users**. To use `suspendUser` and `activateUser`, the role also needs the vault authorization to manage users. To use `listUsers` and `getVaultUser`, it needs the **Audit users** vault authorization.
5. In Privilege Cloud, add the user as a member of each safe the connector acts on, with the safe permissions listed in [Required permissions](#idira-required-permissions).
6. Note your identity tenant ID, shown in the identity tenant URL (`https://your-tenant-id.id.cyberark.cloud`), and your Privilege Cloud URL.
7. In {{kib}}, create the connector with the Privilege Cloud URL, the token URL `https://your-tenant-id.id.cyberark.cloud/oauth2/platformtoken`, and the service user's name and password as the client ID and client secret.

#### Required permissions [idira-required-permissions]

Privilege Cloud sets permissions per safe, so an action can succeed on one safe and fail with HTTP 403 on another. Add the service user as a member of each safe the connector acts on, with the permissions of the actions you use:

| Safe permission | Required for |
| --- | --- |
| List accounts | `listAccounts`, `getAccountDetails` |
| View audit log | `getAccountActivity` |
| Initiate CPM account management operations | `changeAccountPassword`, `reconcileAccountCredentials`, `verifyAccountCredentials`, `setAccountPassword` |
| Specify next account content | `setAccountPassword` |
| Add accounts | `addAccount` |
| Update account properties | `addAccount` (when it sets properties), `updateAccount` |
| Rename accounts | `updateAccount` (when it changes the name) |
| View Safe members | `listSafeMembers` |
| Manage Safe members | `addSafeMember`, `removeSafeMember` |

`suspendUser` and `activateUser` need the vault authorization to manage users rather than a safe permission, and `listUsers` and `getVaultUser` need the **Audit users** vault authorization. The Privilege Cloud docs don't name the permission that `listRiskySessions` needs; it returns only the sessions the service user is allowed to see. On tenants that manage users in Identity Administration, an Identity-managed user can't be changed through the vault Users API, and these actions return HTTP 403 or 404 for that user.

### Connector configuration [idira-connector-configuration]

Idira Privilege Cloud connectors have the following configuration properties:

Privilege Cloud URL
:   Your tenant's Privilege Cloud address, for example `https://your-subdomain.privilegecloud.cyberark.cloud`. Tenants that haven't moved to Shared Services use `https://your-subdomain.privilegecloud.cyberark.com`. The connector adds `/PasswordVault/API` itself; a URL that already ends with `/PasswordVault` or `/PasswordVault/API` also works. The URL must use `https`; `http` is accepted only for `localhost`, such as a local proxy or test server. The URL can't contain a query string (`?`) or a fragment (`#`).

Token URL
:   Your identity tenant's platform token endpoint, `https://your-tenant-id.id.cyberark.cloud/oauth2/platformtoken`. Replace `your-tenant-id` with your identity tenant ID. The URL must use `https`; `http` is accepted only for `localhost`. You can't save the connector with any other token URL, because {{kib}} sends the client secret to it.

Client ID
:   The user name of the service user, for example `kibana-svc@cyberark.cloud.12345`.

Client secret
:   The service user's password.

### Connector networking configuration [idira-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

### Test connectors [idira-action-configuration]

**Test connector** requests a token from the identity tenant and lists at most one account. It checks the token URL, the client credentials, the Privilege Cloud URL, and API access. The test fails when the Privilege Cloud URL answers with something other than an accounts list, such as an HTML sign-in page or an empty body, and the error quotes what came back.

## Connector actions [idira-connector-actions]

Account IDs look like `12_3` and come from `listAccounts`. Safe names come from the `safeName` field of an account.

### Accounts [idira-accounts]

`listAccounts`
:   Search privileged accounts. Returns one page: the accounts in `value` (each with `id`, `name`, `address`, `userName`, `platformId`, `safeName`, `secretType`, and `secretManagement`), the number of matching accounts in `count`, and `nextOffset` when another page follows. Only accounts in safes where the service user has the List accounts permission are returned; accounts in other safes are left out without an error.
    - `search` (optional): Space-separated keywords matched against account name, address, and user name, for example `svc-backup 192.0.2.5`.
    - `searchType` (optional): `contains` (default) or `startswith`.
    - `safeName` (optional): Only accounts in this safe.
    - `platformId` (optional): Only accounts on this platform, for example `WinServerLocal`. Sent as the filter condition `platformId eq`.
    - `filter` (optional): A filter expression, for example `modificationTime gte 1700000000` or `userName contains admin AND address contains 192.0.2`. Use only `AND` or only `OR` between conditions, in uppercase, with at most eight conditions in all. A lowercase `and` or `or` inside a value isn't read as an operator. The connector joins `safeName` and `platformId` to the filter with `AND`, so a filter that uses `OR` can't be combined with them.
    - `savedFilter` (optional): A saved filter: `Regular`, `Recently`, `New`, `Link`, `Deleted`, `PolicyFailures`, `AccessedByUsers`, `ModifiedByUsers`, `ModifiedByCPM`, `DisabledPasswordByUser`, `DisabledPasswordByCPM`, `ScheduledForChange`, `ScheduledForVerify`, `ScheduledForReconcile`, `SuccessfullyReconciled`, `FailedChange`, `FailedVerify`, `FailedReconcile`, `LockedOrNew`, `Locked` (only accounts locked by the service user), or `Favorites`. Can be combined with the other search and filter parameters.
    - `sort` (optional): Property and direction, for example `userName asc`.
    - `offset` (optional): Index of the first result. To read the next page, pass `nextOffset` from the previous result.
    - `limit` (optional): Page size, 1–1,000. Defaults to 50.

`getAccountDetails`
:   Get one account by ID: `safeName`, `platformId`, `address`, `userName`, `secretType`, `createdTime`, `platformAccountProperties`, and `secretManagement` with `automaticManagementEnabled`, `manualManagementReason`, `status`, `lastModifiedTime`, `lastReconciledTime`, and `lastVerifiedTime`. The record never contains the credential.
    - `accountId` (required): The account ID, for example `12_3`.

`getAccountActivity`
:   Get the newest audit activity of an account. Returns `Activities` (at most `limit`, newest first by `Date`; each with `Date`, `User`, `Action`, `ActionID`, `ClientID`, `MoreInfo`, `Reason`, and `Alert`; `Date` is returned as Privilege Cloud sends it, in epoch seconds or as a UTC date-time), `total` (the number of activities Privilege Cloud reports), `truncated` (`true` when older activities were left out), and `newestFirst` (`false` when a `Date` could not be read, in which case the Privilege Cloud order is kept). The endpoint has no paging, so activities older than the `limit` newest cannot be read.
    - `accountId` (required): The account ID.
    - `limit` (optional): The most activities to return, from 1 to 1000. Defaults to 100.

`addAccount` _(API only)_
:   Add a privileged account to a safe. Returns the new account record, without the secret. When the account is already in the safe, the action fails with an `Already exists` error that names the account and the safe.
    - `safeName` (required): The safe, at most 28 characters. Safe names can't contain `\ / : * < > " . | ? % & +`.
    - `platformId` (required): The platform that manages the account.
    - `address`, `userName`, `name` (optional): The target address, the account's user name, and the account name in the vault. The vault generates a name when you omit it.
    - `secretType` (optional): `password` or `key`.
    - `secret` (optional): The initial credential: a password, or an SSH private key when `secretType` is `key`. Take the value from a secret source, such as a secrets manager, never from alert data or chat. The connector passes it straight to Privilege Cloud: it never logs or returns it, and removes it from error messages.
    - `platformAccountProperties` (optional): Platform properties as string values, for example `{"LogonDomain": "corp"}`.
    - `secretManagement` (optional): `automaticManagementEnabled` and `manualManagementReason`.

`updateAccount` _(API only)_
:   Replace stored properties of an account with JSON Patch `replace` operations. Properties that the operations don't name keep their values. The credential doesn't change. Returns the updated account.
    - `accountId` (required): The account ID.
    - `operations` (required): 1–50 operations (a limit of the connector), each like `{"op": "replace", "path": "/address", "value": "192.0.2.6"}`. The `path` is `/address`, `/name`, `/platformId`, `/userName`, or `/platformAccountProperties/` followed by a property name.

### Credential management [idira-credentials]

The CPM runs these operations in the background. Each action returns `accountId` and `queued: true` after the CPM accepts the request. To check the outcome, call `getAccountDetails` until the matching timestamp in `secretManagement` is later than its value before the call, then read `secretManagement.status`: `succeeded` or `failed` (`inProcess` while the CPM works).

`changeAccountPassword`
:   Change the credential to a new random value on the target system and in the vault. Only this account changes unless `changeEntireGroup` is `true`. Accounts in an account group share one credential: to contain a compromised credential of a grouped account, set `changeEntireGroup` to `true`, or the other accounts in the group keep the old value. When the operation completes, `lastModifiedTime` updates.
    - `accountId` (required): The account ID.
    - `changeEntireGroup` (optional): Only matters for an account in an account group. Defaults to `false`, which changes only this account. The connector always sends the value, as both `ChangeEntireGroup` and `ChangeCredsForGroup`, because the Privilege Cloud docs use both names and the default is `true`. Set `true` to change every account in the group.

`reconcileAccountCredentials`
:   Reconcile the account with the platform's reconcile account, so the target system and the vault match again after someone changes the credential outside Privilege Cloud. When the operation completes, `lastReconciledTime` updates.
    - `accountId` (required): The account ID.

`verifyAccountCredentials`
:   Check that the vaulted credential still works on the target system. No credential changes, but a failed check marks the account as failed. When the operation completes, `lastVerifiedTime` updates.
    - `accountId` (required): The account ID.

`setAccountPassword` _(API only)_
:   Change the credential to a value you supply. Take the password from a secret source, such as a secrets manager, never from alert data or chat. The connector passes it straight to Privilege Cloud: it never logs or returns it, and removes it from error messages. When you run the action with the Run a connector API, {{kib}} doesn't keep a copy of the input.
    - `accountId` (required): The account ID.
    - `newCredentials` (required): The new password, at most 128 characters, meeting the platform's password policy.
    - `changeImmediately` (optional): `true` changes the password immediately; `false` changes it at the next scheduled change.

### Safe members [idira-safe-members]

`listSafeMembers`
:   List the members of a safe with `memberName`, `memberType`, `memberId`, `permissions`, `membershipExpirationDate`, and `isPredefinedUser`. Returns one page, and `nextOffset` when another page follows.
    - `safeName` (required): The safe name.
    - `search` (optional): Member name keywords.
    - `filter` (optional): A filter expression, for example `memberType eq User`.
    - `sort` (optional): Property and direction, for example `memberName asc`.
    - `offset` (optional): Index of the first result.
    - `limit` (optional): Page size, 1–1,000 (a limit of the connector). Defaults to 25.

`addSafeMember` _(API only)_
:   Give an existing user, group, or role access to a safe. Always returns `safeName`, `memberName`, `memberType`, `permissions`, `membershipExpirationDate`, `added`, and `alreadyMember`. For a new member, these values come from the member record that Privilege Cloud returns, or from the request when Privilege Cloud answers with an empty body, with `added: true` and `alreadyMember: false`. Other fields of the member record, such as `memberId`, aren't returned; use `listSafeMembers` to read them. When the member is already in the safe (Privilege Cloud answers with HTTP 409 or reports `UserAlreadyMemberException`), the connector doesn't change or read the membership: it returns `added: false`, `alreadyMember: true`, and `null` for `permissions` and `membershipExpirationDate`, so you can run it again without an error. Compare with `listSafeMembers` when the permissions matter. With `membershipExpirationDate`, Privilege Cloud removes the membership by itself at that time, which suits just-in-time access.
    - `safeName` (required): The safe name.
    - `memberName` (required): The user, group, or role to add. Can't be `.` or `..`.
    - `memberType` (required): `User`, `Group`, or `Role`.
    - `permissions` (required): The permissions to grant, as Boolean values, for example `{"listAccounts": true, "useAccounts": true}`. The connector rejects unknown permission names.
    - `searchIn` (optional): Where to find the member. Defaults to `Vault`, for vault users. For Identity Administration users and groups, use the ID of the Identity directory; with `Vault`, adding an Identity user fails.
    - `membershipExpirationDate` (optional): When the membership ends, in epoch seconds. Must be in the future.

`removeSafeMember` _(API only)_
:   Remove a member and all of its permissions from a safe. Returns `safeName`, `memberName`, `removed: true`, `alreadyAbsent: false`, and `detail: null`. When Privilege Cloud answers not found (HTTP 404), returns `removed: false`, `alreadyAbsent: true`, and a `detail` that quotes the answer, so you can run it again without an error. Privilege Cloud also answers not found when the safe doesn't exist, so check the safe with `listSafeMembers` when it matters.
    - `safeName` (required): The safe name.
    - `memberName` (required): The member name, as `listSafeMembers` returns it.

### Privileged sessions [idira-sessions]

`listRiskySessions`
:   List the privileged sessions that Privilege Cloud monitors through its session manager, sorted by risk score, highest first, by default. Returns one page: the sessions in `value`, as Privilege Cloud returns them (for example with `SessionGuid`, `RiskScore`, `IsLive`, the vault user, and the account's user name, address, and safe), the `Total` that Privilege Cloud reports in `count`, and `nextOffset` when another page follows. These are sessions with a risk score, not every audit event. To act on a session's account, find its ID with `listAccounts` by searching for the account's user name and address. Only sessions the service user is allowed to see are returned. When Privilege Cloud answers HTTP 403, the error says that the service user lacks the permission to view the sessions of the safe.
    - `fromTime` (optional): Only sessions that started at or after this Unix time, in seconds.
    - `toTime` (optional): Only sessions that started at or before this Unix time, in seconds. Can't be earlier than `fromTime`.
    - `safeName` (optional): Only sessions that use an account in this safe.
    - `search` (optional): Keywords matched against session properties, such as the account's user name, the target address, or the vault user.
    - `activities` (optional): Only sessions with these recorded activities.
    - `sort` (optional): The property to sort by: `RiskScore`, `FileName`, `SafeName`, `FolderName`, `PSMVaultUserName`, `FromIP`, `RemoteMachine`, `Client`, `Protocol`, `AccountUserName`, `AccountAddress`, `AccountPlatformID`, `PSMStartTime`, or `TicketID`. Add a leading `-` to sort in descending order. Defaults to `-RiskScore`.
    - `offset` (optional): Index of the first result. To read the next page, pass `nextOffset` from the previous result.
    - `limit` (optional): Page size, 1–1,000. Defaults to 25.

The security events API of Privileged Threat Analytics (PTA) is available only for self-hosted Privileged Access Manager, so the connector doesn't offer it. The audit events of the Identity Security Platform need separate Audit service credentials (a SIEM API key and a dedicated OAuth app), so the connector doesn't read them either.

### Vault users [idira-vault-users]

The vault user actions take a numeric user ID. To find it from the user name that an alert carries, use `listUsers`. The `enabled` value in the result of `suspendUser` and `activateUser` repeats what the action requested. To confirm the user's state, read the user with `getVaultUser`, or with `listUsers` and `extendedDetails` set to `true`.

`listUsers`
:   Find vault users. Returns one page: `value` (the users as Privilege Cloud returns them, each with `id`, `username`, `source`, `userType`, `componentUser`, and `location`), `count` (the `Total` that Privilege Cloud reports), and `nextOffset` when another page follows. If Privilege Cloud ignores the paging parameters and returns every matching user, the connector returns the requested page of that list and calculates `nextOffset` itself. Covers vault users only, not Identity directory accounts. Needs the **Audit users** vault authorization.
    - `userName` (optional): The exact vault user name, for example `jsmith@corp.example.com`. Sent as the filter condition `userName eq`.
    - `search` (optional): Keywords matched against the user name, first name, and last name.
    - `userType` (optional): Only users of this type, for example `EPVUser`.
    - `componentUser` (optional): `true` returns only component (application) users; `false` returns only personal users.
    - `sort` (optional): Up to three of `username`, `source`, `userType`, `location`, `lastname`, `firstname`, and `middlename`, separated by commas, each optionally followed by `asc` (default) or `desc`. For example, `lastname asc, firstname`.
    - `extendedDetails` (optional): `true` also returns each user's `enabled` and `suspended` state, `groupsMembership`, and, for LDAP users, `userDN`. Defaults to `false`.
    - `offset` (optional): Index of the first result. To read the next page, pass `nextOffset` from the previous result.
    - `limit` (optional): Page size, 1–1,000. Defaults to 100.

`suspendUser` _(API only)_
:   Disable a vault user, so the user can no longer sign in to the vault. Privilege Cloud has no manual suspend; disabling is the equivalent. This doesn't change the user's Identity directory account. Returns `userId` and `enabled: false`.
    - `userId` (required): The numeric vault user ID.

`activateUser` _(API only)_
:   Enable a disabled vault user. It doesn't clear a lockout after failed sign-ins. Returns `userId` and `enabled: true`.
    - `userId` (required): The numeric vault user ID.

`getVaultUser`
:   Get a vault user as Privilege Cloud returns it, with `id`, `username`, `source`, `userType`, `componentUser`, `location`, `vaultAuthorization`, `authenticationMethod`, and the user's state, such as `enableUser` and `suspended`. The connector adds `enabled`, the user's state read from `enableUser` or, when that is absent, from `enabled` (the Privilege Cloud docs use both names); it is `null` when neither is returned. Use it to confirm `suspendUser` (`enabled` is `false`) and `activateUser` (`enabled` is `true`). `suspended` is `true` after too many failed sign-ins. Needs the **Audit users** vault authorization.
    - `userId` (required): The numeric vault user ID.

## Usage notes [idira-usage-notes]

- When Privilege Cloud rate-limits a request (HTTP 429), the connector retries it, for every action: a rate-limited request isn't processed, so a retry can't apply a change twice. Before each retry it waits for the `Retry-After` time when Privilege Cloud sends one, and otherwise for 1, 2, and then 4 seconds. It sends at most 4 requests per action call and waits at most 30 seconds in total. When the limit persists, or the requested wait is longer, the action fails with an error that gives the `Retry-After` wait. Run the action again after that wait. The connector doesn't retry any other error.
- Each request times out after 30 seconds, or after the {{kib}} Actions timeout (`xpack.actions.responseTimeout`) when that's shorter.
- When a request that changes data was sent and then times out, loses its connection, or gets HTTP 500 or higher, Privilege Cloud might have applied the change, and the error says so. A request that was never sent, for example because the host isn't in `xpack.actions.allowedHosts`, the TLS handshake failed, or the host name didn't resolve, doesn't get that note. Check the current state before you run the action again, for example with `getAccountDetails` after a credential operation or `listSafeMembers` after a membership change, so that a rotation isn't queued twice.
- After HTTP 401, the connector discards its cached access token, and the next call requests a new one.
- A response larger than `xpack.actions.maxResponseContentLength` (1 MB by default) fails with an error that says so. Request a smaller page with `limit`, narrow the search, or raise the setting.
- An HTTP 403 error names the permission that the action needs.
- `listAccounts`, `listSafeMembers`, `listRiskySessions`, `listUsers`, and `getAccountActivity` fail when Privilege Cloud answers with something other than a list, such as an HTML sign-in page or an empty body, and the error quotes what came back. An empty list is a valid answer and returns no items.
- `getAccountDetails`, `addAccount`, `updateAccount`, and `getVaultUser` fail the same way when the answer isn't a record with an `id`. `addSafeMember` fails when the answer is neither a member record nor an empty body with HTTP 201 or 204.
- `changeAccountPassword`, `reconcileAccountCredentials`, `verifyAccountCredentials`, `setAccountPassword`, `suspendUser`, `activateUser`, and `removeSafeMember` succeed on an empty body or a JSON answer. They fail when Privilege Cloud answers with text or an HTML page, such as a sign-in page, and the error quotes what came back.
- The connector removes leading and trailing spaces from text inputs such as `search`, `filter`, `sort`, and `userName` before it checks them. A value of only spaces counts as not set.
