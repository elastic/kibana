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

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Overview [idira-overview]

The connector signs in as a Privilege Cloud service user. It requests an OAuth 2.0 access token from your Idira identity tenant with the service user's client credentials, and sends every API request to your tenant's Privilege Cloud address. The two addresses are different hosts: the token URL is on `id.cyberark.cloud`, and the Privilege Cloud URL is on `privilegecloud.cyberark.cloud`. In {{kib}}, you need an Enterprise license.

The connector doesn't support self-hosted Privileged Access Manager, Endpoint Privilege Manager, or Identity directory administration.

## Create connectors in {{kib}} [define-idira-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

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

### Required permissions [idira-required-permissions]

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

`suspendUser` and `activateUser` need the vault authorization to manage users rather than a safe permission. On tenants that manage users in Identity Administration, an Identity-managed user can't be changed through the vault Users API, and these actions return HTTP 403 or 404 for that user.

## Test connectors [idira-action-configuration]

**Test connector** requests a token from the identity tenant and lists at most one account. It checks the token URL, the client credentials, the Privilege Cloud URL, and API access.

## Connector actions [idira-connector-actions]

Account IDs look like `12_3` and come from `listAccounts`. Safe names come from the `safeName` field of an account.

### Accounts [idira-accounts]

`listAccounts`
:   Search privileged accounts. Returns one page: the accounts in `value` (each with `id`, `name`, `address`, `userName`, `platformId`, `safeName`, `secretType`, and `secretManagement`), the number of matching accounts in `count`, and `nextOffset` when another page follows.
    - `search` (optional): Space-separated keywords matched against account name, address, and user name, for example `svc-backup 192.0.2.5`.
    - `searchType` (optional): `contains` (default) or `startswith`.
    - `safeName` (optional): Only accounts in this safe.
    - `platformId` (optional): Only accounts on this platform, for example `WinServerLocal`.
    - `filter` (optional): A filter expression, combined with `safeName` and `platformId` using `AND`.
    - `savedFilter` (optional): A preset filter, for example `Recently`, `Locked`, or `FailedChange`.
    - `sort` (optional): Property and direction, for example `userName asc`.
    - `offset` (optional): Index of the first result. To read the next page, pass `nextOffset` from the previous result.
    - `limit` (optional): Page size, 1–1,000. Defaults to 50.

`getAccountDetails`
:   Get one account by ID: `safeName`, `platformId`, `address`, `userName`, `secretType`, `createdTime`, `platformAccountProperties`, and `secretManagement` with `automaticManagementEnabled`, `manualManagementReason`, `status`, `lastModifiedTime`, `lastReconciledTime`, and `lastVerifiedTime`. The record never contains the credential.
    - `accountId` (required): The account ID, for example `12_3`.

`getAccountActivity`
:   Get the audit activity of an account. Returns `Activities` (each with `Date`, `User`, `Action`, `ActionID`, `ClientID`, `MoreInfo`, `Reason`, and `Alert`) and `Total`. This endpoint might not be available on every tenant.
    - `accountId` (required): The account ID.

`addAccount` _(not yet available)_
:   Add a privileged account to a safe. Returns the new account record, without the secret.
    - `safeName` (required): The safe, at most 28 characters. Safe names can't contain `\ / : * < > " . | ? % & +`.
    - `platformId` (required): The platform that manages the account.
    - `address`, `userName`, `name` (optional): The target address, the account's user name, and the account name in the vault. The vault generates a name when you omit it.
    - `secretType` (optional): `password` or `key`.
    - `secret` (optional): The initial credential: a password, or an SSH private key when `secretType` is `key`. The value is stored in the action's execution record, like every action input, so take it from a secret source such as a secrets manager, never from alert data or chat. The connector never returns it.
    - `platformAccountProperties` (optional): Platform properties as string values, for example `{"LogonDomain": "corp"}`.
    - `secretManagement` (optional): `automaticManagementEnabled` and `manualManagementReason`.

`updateAccount` _(not yet available)_
:   Replace stored properties of an account with JSON Patch `replace` operations. Properties that the operations don't name keep their values. The credential doesn't change. Returns the updated account.
    - `accountId` (required): The account ID.
    - `operations` (required): 1–50 operations, each like `{"op": "replace", "path": "/address", "value": "192.0.2.6"}`. The `path` is `/address`, `/name`, `/platformId`, `/userName`, or `/platformAccountProperties/` followed by a property name.

### Credential management [idira-credentials]

The CPM runs these operations in the background. Each action returns `accountId` and `queued: true` after the CPM accepts the request. To check the outcome, call `getAccountDetails` until the matching timestamp in `secretManagement` is later than its value before the call, then read `secretManagement.status`: `succeeded` or `failed` (`inProcess` while the CPM works).

`changeAccountPassword`
:   Change the credential to a new random value on the target system and in the vault. When the operation completes, `lastModifiedTime` updates.
    - `accountId` (required): The account ID.
    - `changeEntireGroup` (optional): Only matters for an account in an account group. Privilege Cloud defaults to `true`, which changes every account in the group. Set `false` to change only this account.

`reconcileAccountCredentials`
:   Reconcile the account with the platform's reconcile account, so the target system and the vault match again after an out-of-band change. When the operation completes, `lastReconciledTime` updates.
    - `accountId` (required): The account ID.

`verifyAccountCredentials`
:   Check that the vaulted credential still works on the target system. No credential changes, but a failed check marks the account as failed. When the operation completes, `lastVerifiedTime` updates.
    - `accountId` (required): The account ID.

`setAccountPassword` _(not yet available)_
:   Change the credential to a value you supply. The password is stored in the action's execution record, like every action input, so take it from a secret source such as a secrets manager, never from alert data or chat. The connector never returns it.
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
    - `limit` (optional): Page size, 1–1,000. Defaults to 25.

`addSafeMember` _(not yet available)_
:   Give an existing user, group, or role access to a safe. Returns the new member and `added: true`. When the member is already in the safe, returns `added: false` and `alreadyMember: true` without changing its permissions, so you can run it again without an error. With `membershipExpirationDate`, Privilege Cloud removes the membership by itself at that time, which suits just-in-time access.
    - `safeName` (required): The safe name.
    - `memberName` (required): The user, group, or role to add.
    - `memberType` (required): `User`, `Group`, or `Role`.
    - `permissions` (required): The permissions to grant, as Boolean values, for example `{"listAccounts": true, "useAccounts": true}`. The connector rejects unknown permission names.
    - `searchIn` (optional): Where to find the member. Defaults to `Vault`, for vault users. For Identity Administration users and groups, use the ID of the Identity directory; with `Vault`, adding an Identity user fails.
    - `membershipExpirationDate` (optional): When the membership ends, in epoch seconds. Must be in the future.

`removeSafeMember` _(not yet available)_
:   Remove a member and all of its permissions from a safe. Returns `removed: true`. When the member isn't found, returns `removed: false` and `alreadyAbsent: true`, so you can run it again without an error. A missing safe gives the same answer.
    - `safeName` (required): The safe name.
    - `memberName` (required): The member name, as `listSafeMembers` returns it.

### Vault users [idira-vault-users]

`suspendUser` _(not yet available)_
:   Disable a vault user, so the user can no longer sign in to the vault. Privilege Cloud has no manual suspend; disabling is the equivalent. This doesn't change the user's Identity directory account. Returns `userId` and `enabled: false`.
    - `userId` (required): The numeric vault user ID.

`activateUser` _(not yet available)_
:   Enable a disabled vault user. It doesn't clear a lockout after failed sign-ins. Returns `userId` and `enabled: true`.
    - `userId` (required): The numeric vault user ID.

## Usage notes [idira-usage-notes]

- The connector retries a rate-limited request (HTTP 429) up to three times with backoff, and honors a `Retry-After` header when Privilege Cloud sends one. The connector also retries a read request after HTTP 502, 503, or 504. It doesn't retry a request that changes data after any other error, so it never sends a rotation twice.
- Each request times out after 30 seconds, and one action call, retries included, stops after 100 seconds, which keeps it within the time that Kibana allows a connector call. When a `Retry-After` wait would pass that limit, the connector doesn't retry. It returns the rate-limit or timeout error, which says that the time limit was reached. Wait, and then run the action again.
- After HTTP 401, the connector discards its cached access token, and the next call requests a new one.
- A response larger than `xpack.actions.maxResponseContentLength` (1 MB by default) fails with an error that says so. Request a smaller page with `limit`, narrow the search, or raise the setting.
- Errors name the safe permission that the action needs.

## Connector networking configuration [idira-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [idira-api-credentials]

The connector uses a service user that is an OAuth confidential client. To create one:

1. In Identity Administration, select **Core Services** > **Users** and add a user, for example `kibana-svc`.
2. Select **Is OAuth confidential client** and **Is service user**.
3. In the **Password** field, enter a strong password. The user name is the client ID and the password is the client secret.
4. Add the user to a role that gives it access to Privilege Cloud, for example **Privilege Cloud Users**. To use `suspendUser` and `activateUser`, the role also needs the vault authorization to manage users.
5. In Privilege Cloud, add the user as a member of each safe the connector acts on, with the safe permissions listed in [Required permissions](#idira-required-permissions).
6. Note your identity tenant ID, shown in the identity tenant URL (`https://your-tenant-id.id.cyberark.cloud`), and your Privilege Cloud URL.
7. In {{kib}}, create the connector with the Privilege Cloud URL, the token URL `https://your-tenant-id.id.cyberark.cloud/oauth2/platformtoken`, and the service user's name and password as the client ID and client secret.
