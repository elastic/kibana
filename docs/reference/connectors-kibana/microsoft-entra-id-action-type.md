---
navigation_title: "Microsoft Entra ID"
type: reference
description: "Use the Microsoft Entra ID connector to look up users, groups, sign-in methods, app access, and Identity Protection risk in Microsoft Entra ID."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Microsoft Entra ID connector [microsoft-entra-id-action-type]

The Microsoft Entra ID connector uses the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview) so agents can investigate an account in Microsoft Entra ID (formerly Azure Active Directory). Agents can find the user, its groups and directory roles, the applications it can use, the sign-in methods it has registered, and its Identity Protection risk.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Create connectors in {{kib}} [define-microsoft-entra-id-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [microsoft-entra-id-connector-configuration]

Microsoft Entra ID connectors have the following configuration properties:

Microsoft Graph URL
:   The Microsoft Graph host the connector calls. Keep `https://graph.microsoft.com` for the global service. For a national cloud, enter its Graph host: `https://graph.microsoft.us` (US Government L4), `https://dod-graph.microsoft.us` (US Government L5), or `https://microsoftgraph.chinacloudapi.cn` (China). The URL must use `https` and have no path.

Use the Graph beta endpoint for raw requests (`useBeta`)
:   `false` (default) or `true`. When `true`, the `request` action calls the Microsoft Graph `beta` endpoint instead of `v1.0`. Every other action always calls `v1.0`. Microsoft can change beta APIs without notice.

Authentication
:   Both methods use an app registration in your tenant with application permissions and admin consent:

    - **OAuth client credentials** (recommended): the **Token URL** (`https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`), **Client ID**, and **Client secret**
    - **OAuth client credentials with a certificate**: the **Token URL**, **Client ID**, and the certificate and private key uploaded to the app registration, instead of a client secret

    Enter `https://graph.microsoft.com/.default` in **Scope**. For a national cloud, use the sign-in host and the `.default` scope of that cloud, for example `https://login.microsoftonline.us/{tenant-id}/oauth2/v2.0/token` and `https://graph.microsoft.us/.default`.

## Test connectors [microsoft-entra-id-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test requests a token and reads one user ID, which needs the `User.Read.All` application permission.

## Connector actions [microsoft-entra-id-connector-actions]

The Microsoft Entra ID connector exposes the following actions. List actions return one page and a `nextLink`. Pass `nextLink` back to the same action to read the next page. Microsoft Graph might return not found for up to a minute after you create a user or group while the change replicates. Retry the call.

### Users

`getUser`
:   Gets one user by object ID, user principal name, or email address. Returns `found`, `resolvedBy` (`id`, `userPrincipalName`, or `mail`), and the user's `id`, `userPrincipalName`, `displayName`, `mail`, `accountEnabled`, `department`, `jobTitle`, `signInSessionsValidFromDateTime`, and `lastPasswordChangeDateTime`. `found` is `false` when no user matches. An email address shared by several users is an error that lists their IDs.
    - `userId` (required): Object ID, user principal name, or email address.
    - `select` (optional): Property names to return instead of the default list. The result always includes `id`.

`listUsers`
:   Finds users with an OData filter or a search.
    - `filter` (optional): OData filter, for example `department eq 'Sales'`.
    - `search` (optional): Search in `"property:text"` form, quotes included, for example `"displayName:smith"`.
    - `top` (optional): Page size, 1 to 999.
    - `select` (optional): Property names to return.
    - `advancedQuery` (optional): Set to `true` for filters that use `endsWith`, `ne`, or `not`, and to return the total `count`.
    - `nextLink` (optional): The `nextLink` of the previous page.

`disableUser` _(not yet available)_
:   Blocks sign-in for a user. The action keeps the account and its data. Returns a `status` of `requested` or `notFound`.
    - `userId` (required): Object ID or user principal name.

`enableUser` _(not yet available)_
:   Allows sign-in again for a disabled user. Returns a `status` of `requested` or `notFound`.
    - `userId` (required): Object ID or user principal name.

`revokeSignInSessions` _(not yet available)_
:   Invalidates the user's refresh tokens and session cookies, so the user must sign in again in every application. It might take a few minutes to take effect. Returns a `status` of `requested` or `notFound`.
    - `userId` (required): Object ID or user principal name.

`resetUserPassword` _(not yet available)_
:   Replaces the user's password, so a stolen password stops working. You can't reset the password of a user federated from an on-premises directory. {{kib}} stores the password with the action's inputs, and the result doesn't include it.
    - `userId` (required): Object ID or user principal name.
    - `newPassword` (required): The new password. It must meet the tenant's password policy.
    - `forceChangePasswordNextSignIn` (optional): Require a new password at the next sign-in. Defaults to `true`.

`createUser` _(not yet available)_
:   Creates a cloud-only user. Returns the new user's ID, user principal name, display name, and `accountEnabled`. {{kib}} stores the password with the action's inputs, and the result doesn't include it.
    - `accountEnabled` (required): Whether the user can sign in.
    - `displayName` (required): The display name.
    - `mailNickname` (required): The mail alias, for example `jdoe`.
    - `userPrincipalName` (required): The sign-in name, on a verified domain of the tenant. Up to 64 characters before the `@` and up to 48 after it.
    - `password` (required): The initial password. It must meet the tenant's password policy.
    - `forceChangePasswordNextSignIn` (optional): Defaults to `true`.

`updateUser` _(not yet available)_
:   Sets properties of a user, for example `department` or `jobTitle`. Only the properties given change. To change a password, use `resetUserPassword`. You can't update a user synced from an on-premises Active Directory: the action returns Microsoft Graph's error. A `null` value is sent to Microsoft Graph as given, but it might not clear the property.
    - `userId` (required): Object ID or user principal name.
    - `properties` (required): The properties to set, for example `{"department": "Finance"}`.

`deleteUser` _(not yet available)_
:   Deletes a user. According to Microsoft's documentation, a deleted user stays in the directory's deleted items for 30 days and can be restored there.
    - `userId` (required): Object ID or user principal name.

### Sign-in methods

`getUserAuthMethods`
:   Lists the sign-in and multifactor authentication (MFA) methods a user has registered, such as phone, FIDO2 security key, Microsoft Authenticator, and Temporary Access Pass. Each item has an `id` and a `methodType`. Returns `found: false` when the user doesn't exist.
    - `userId` (required): Object ID or user principal name.

`deleteAuthMethod` _(not yet available)_
:   Removes one registered method, for example a stolen security key. You can't remove the password. The action also refuses to remove a phone that is the user's default MFA method until the user changes the default.
    - `userId` (required): Object ID or user principal name.
    - `methodType` (required): `fido2`, `email`, `microsoftAuthenticator`, `phone`, `softwareOath`, `windowsHelloForBusiness`, or `temporaryAccessPass`.
    - `methodId` (required): The method's `id` from `getUserAuthMethods`.

`resetUserMfa` _(not yet available)_
:   Removes every removable method so the user must register MFA again. The action keeps the password and removes phones last. Returns `removed`, `failed` (with the reason), and `skipped`. The action doesn't roll back: methods it removed stay removed when others fail. It fails only when it can't remove any method.
    - `userId` (required): Object ID or user principal name.

### Groups

`getUserGroups`
:   Lists the groups and directory roles a user belongs to, including nested memberships.
    - `userId` (required): Object ID or user principal name.
    - `transitive` (optional): Set to `false` for direct memberships only.
    - `top` (optional): Page size, 1 to 999.
    - `nextLink` (optional): The `nextLink` of the previous page.

`listGroups`
:   Finds groups with an OData filter, for example `displayName eq 'Quarantine'`, or a search.
    - `filter`, `search`, `top`, `advancedQuery`, `nextLink` (optional): As for `listUsers`.

`listGroupMembers`
:   Lists the members of a group: users, groups, devices, and service principals.
    - `groupId` (required): Group object ID.
    - `top`, `select`, `nextLink` (optional): As for `listUsers`.

`addUserToGroup` _(not yet available)_
:   Adds a user to a group. Returns a `status` of `skipped` when the user is already a member. Microsoft Graph reports an existing membership only as a generic `400 Request_BadRequest` error, so the connector recognizes this case from the text of the error message. Any other `400` error still fails the action.
    - `groupId` (required): Group object ID.
    - `userId` (required): User object ID.

`removeUserFromGroup` _(not yet available)_
:   Removes a user's membership in a group. The user doesn't change. Returns a `status` of `notFound` when the group, the user, or the membership doesn't exist.
    - `groupId` (required): Group object ID.
    - `userId` (required): User object ID.

### Identity Protection

`listRiskyUsers`
:   Lists users flagged by Identity Protection, with `riskLevel`, `riskState`, `riskDetail`, and `riskLastUpdatedDateTime`. Requires Microsoft Entra ID P2.
    - `filter` (optional): OData filter, for example `riskLevel eq 'high'`.
    - `top` (optional): Page size, 1 to 500.
    - `nextLink` (optional): The `nextLink` of the previous page.

`confirmCompromisedUser` _(not yet available)_
:   Marks users as compromised, which sets their risk level to high. Requires Microsoft Entra ID P2 and the `IdentityRiskyUser.ReadWrite.All` application permission with admin consent. Without that consent, Microsoft Graph returns `403` because required scopes are missing in the token. User IDs that don't exist are returned in `notFound` and not sent. The action fails when none of the users exists.
    - `userIds` (required): Up to 60 user object IDs.

`dismissRiskyUser` _(not yet available)_
:   Dismisses the risk of users after a false positive. Requires Microsoft Entra ID P2 and the `IdentityRiskyUser.ReadWrite.All` application permission with admin consent. Without that consent, Microsoft Graph returns `403` because required scopes are missing in the token. User IDs that don't exist are returned in `notFound` and not sent. The action fails when none of the users exists.
    - `userIds` (required): Up to 60 user object IDs.

### Applications

`listUserAppRoleAssignments`
:   Lists the applications a user is assigned to, with the assignment `id`, the application's `resourceId` and `resourceDisplayName`, and the `appRoleId`.
    - `userId` (required): Object ID or user principal name.
    - `top` (optional): Page size, 1 to 999. Defaults to 100.
    - `nextLink` (optional): The `nextLink` of the previous page.

`revokeUserAppAssignment` _(not yet available)_
:   Removes a user's access to an application. Returns `removed`, `failed`, and `skipped` (assignments already removed, or left when the time limit is reached). The status is `notFound` when nothing matches.
    - `userId` (required): Object ID or user principal name.
    - `appRoleAssignmentId` or `resourceId` (exactly one): The assignment `id` from `listUserAppRoleAssignments`, or the application's service principal object ID to remove every assignment of the user to it.

### Raw Microsoft Graph requests

`request` _(not yet available)_
:   Sends a request to a Microsoft Graph path that no other action covers, with the app's permissions. It calls `v1.0`, or `beta` when the connector's `useBeta` setting is `true`. Returns the HTTP `status` and the response body, including error responses.
    - `method` (required): `GET`, `POST`, `PATCH`, `PUT`, or `DELETE`.
    - `path` (required): A relative path without the version, for example `/users/{id}/authentication/temporaryAccessPassMethods`.
    - `query` (optional): Query parameters, for example `{"$select": "id,displayName"}`.
    - `body` (optional): JSON body, for `POST`, `PATCH`, and `PUT` only.

## Required permissions [microsoft-entra-id-required-permissions]

Grant these Microsoft Graph application permissions to the app registration, then grant admin consent:

| Permission | Required for |
| ---------- | ------------ |
| `User.Read.All` | `getUser`, `listUsers`, `getUserGroups`, and the connection test |
| `Directory.Read.All` | `getUserGroups` with `transitive` set to `false`, and `listUserAppRoleAssignments` |
| `Group.Read.All` | `listGroups` |
| `GroupMember.Read.All` | `listGroupMembers` |
| `UserAuthenticationMethod.Read.All` | `getUserAuthMethods` |
| `IdentityRiskyUser.Read.All` | `listRiskyUsers` |
| `User.EnableDisableAccount.All` | `disableUser`, `enableUser` |
| `User.RevokeSessions.All` | `revokeSignInSessions` |
| `User-PasswordProfile.ReadWrite.All` | `resetUserPassword` |
| `UserAuthenticationMethod.ReadWrite.All` | `deleteAuthMethod`, `resetUserMfa` |
| `GroupMember.ReadWrite.All` | `addUserToGroup`, `removeUserFromGroup` |
| `IdentityRiskyUser.ReadWrite.All` | `confirmCompromisedUser`, `dismissRiskyUser` (these also need Microsoft Entra ID P2) |
| `AppRoleAssignment.ReadWrite.All` | `revokeUserAppAssignment` |
| `User.ReadWrite.All` | `createUser`, `updateUser`, `deleteUser` |

Grant only the permissions for the actions you use. Changing an administrator's account (disabling it, resetting its password, or removing its sign-in methods) also needs the app to hold a matching Microsoft Entra role, such as Privileged Authentication Administrator. The `request` action needs the permission of the path it calls. New permissions might take a few minutes to reach the connector's token.

## Connector networking configuration [microsoft-entra-id-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [microsoft-entra-id-api-credentials]

1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com) as at least an Application Administrator.
2. Go to **Entra ID** → **App registrations** (in older layouts, **Identity** → **Applications** → **App registrations**) and click **New registration**. Enter a name, make sure **Accounts in this organizational directory only** is selected, and click **Register**.
3. On the **Overview** page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
4. Go to **API permissions**, click **Add a permission**, and select **Microsoft Graph** → **Application permissions**. Add the permissions from [Required permissions](#microsoft-entra-id-required-permissions) for the actions you use. A Privileged Role Administrator or Global Administrator must then click **Grant admin consent**.
5. Add a credential:
    - For a client secret: select **Certificates & secrets** → **Client secrets**, click **New client secret**, and copy the secret's **Value**. The admin center shows it only once.
    - For a certificate: select **Certificates & secrets** → **Certificates**, click **Upload certificate**, and upload the public certificate. Keep the matching private key for {{kib}}.
6. In {{kib}}, create the connector. In the **Token URL** field, enter `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`, replacing `{tenant-id}` with your tenant ID. Then enter the **Client ID**, and the client secret or the certificate and private key.

For more information, refer to [Register an application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) and [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference).
