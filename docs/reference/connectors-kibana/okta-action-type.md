---
navigation_title: "Okta"
type: reference
description: "Use the Okta connector to contain compromised identities — suspend users, revoke sessions, reset MFA factors, manage group membership, and query System Log events."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Okta connector [okta-action-type]

The Okta connector uses the [Okta Management API](https://developer.okta.com/docs/api/) so workflow authors and agents can contain a compromised identity (suspend, revoke sessions, reset factors), reverse false positives, and enrich a response with group membership and System Log events.

## Overview

This is a **custom connector** against your Okta org URL. Prefer an OAuth 2.0 API Services app with private-key JWT client authentication (`RS256` + `kid`). A classic SSWS API token is supported as a fallback for orgs that have not migrated to OAuth for Okta.

{{kib}} does not send [OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://developer.okta.com/docs/guides/dpop/-/main/) proofs on token or API requests. New Okta API Services apps often require DPoP by default. Turn off that requirement on the service app (see [Turn off DPoP for the service app](#okta-disable-dpop)), or use the SSWS API token auth type instead.

## Create connectors in {{kib}} [define-okta-ui]

You can create an Okta connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [okta-connector-configuration]

Org URL
:   Base URL of your Okta organization, for example `https://your-okta-domain.okta.com` or `https://your-okta-domain.oktapreview.com`. Custom domains are supported. Do not include `/api/v1`.

Authentication
:   **Recommended:** OAuth 2.0 client credentials with private-key JWT. Provide the Token URL (`https://your-okta-domain.okta.com/oauth2/v1/token`), Client ID, Key ID (`kid`), and PEM private key. The connector requests scopes `okta.users.manage`, `okta.groups.manage`, and `okta.logs.read`.
:   **Fallback:** SSWS API token from **Security → API → Tokens**. Paste the raw token value. The connector sends `Authorization: SSWS` automatically. Token privileges must allow the same user lifecycle, group, and System Log operations as the OAuth scopes above.

## Available actions [okta-available-actions]

| Action | Description |
|--------|-------------|
| `getUser` | Resolve a user by id, login, or email. Parameters: `userId` (required). |
| `getUserGroups` | List group memberships for a user. Parameters: `userId` (required). |
| `suspendUser` | Suspend an ACTIVE user (reversible containment). Parameters: `userId` (required). |
| `unsuspendUser` | Restore a SUSPENDED user to ACTIVE. Parameters: `userId` (required). |
| `deactivateUser` | Deactivate a user (DEPROVISIONED). Parameters: `userId` (required), `sendEmail`. |
| `activateUser` | Activate a STAGED or DEPROVISIONED user. Parameters: `userId` (required), `sendEmail`. |
| `clearUserSessions` | Revoke IdP sessions (optional OAuth tokens / forget devices). Parameters: `userId` (required), `oauthTokens`, `forgetDevices`. |
| `resetFactors` | Un-enroll all MFA factors. Parameters: `userId` (required). |
| `getUserFactors` | List enrolled MFA factors. Parameters: `userId` (required). |
| `resetPassword` | Start password reset (RECOVERY). Parameters: `userId`, `sendEmail` (required), `revokeSessions`. |
| `expirePassword` | Force password change at next sign-in; optional temporary password. Parameters: `userId` (required), `tempPassword`. |
| `addUserToGroup` | Add a user to a group (for example quarantine). Parameters: `userId`, `groupId` (required). |
| `removeUserFromGroup` | Remove a user from a group. Parameters: `userId`, `groupId` (required). |
| `listUsers` | List users with pagination only. Parameters: `limit`, `after`. Okta does not allow `sortBy` on list queries. |
| `searchUsers` | Find users by `q`, `search`, or `filter` (do not combine `search` and `filter`). Parameters: `q`, `search`, `filter`, `limit`, `after`, `sortBy`, `sortOrder`. `sortBy` requires `search`. |
| `getLogs` | Query System Log events. Parameters: `since`, `until`, `filter`, `q`, `limit`, `sortOrder`, `after`. |

## Required permissions [okta-required-permissions]

Grant these OAuth scopes on the service app (or equivalent admin privileges for an SSWS token):

| Scope | Required for |
| ----- | ------------ |
| `okta.users.manage` | User lifecycle and credentials (`getUser`, suspend/unsuspend, deactivate/activate, sessions, factors, password actions, list/search users) |
| `okta.groups.manage` | Group membership writes (`addUserToGroup`, `removeUserFromGroup`). Without this scope those actions return HTTP 403. |
| `okta.logs.read` | System Log queries (`getLogs`) |

Assign an admin role to the OAuth service app (**Admin roles** on the app). User Administrator covers most user actions; for group membership changes also grant a role that can manage groups (for example Group Administrator or Super Administrator), or a custom role with equivalent permissions. After changing scopes or roles, run **Test connector** again so {{kib}} obtains a new access token.

## Connector networking configuration [okta-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [okta-api-credentials]

### OAuth service app (recommended)

1. Sign in to the Okta Admin Console with privileges to create apps and grant Okta API scopes.
2. Create an **API Services** app integration (**Applications → Applications → Create App Integration**).
3. Set client authentication to **Public key / Private key**, register your public JWKS key (note the `kid`), and store the matching private key securely. When Okta shows the generated key, copy the **PEM** private key (not only the JSON public key). Okta may show the private key only once.
4. Turn off **Require Demonstrating Proof of Possession (DPoP)** on the app (see [Turn off DPoP for the service app](#okta-disable-dpop)). New API Services apps often enable this by default. {{kib}} does not send DPoP proofs yet.
5. On **Okta API Scopes**, grant `okta.users.manage`, `okta.groups.manage`, and `okta.logs.read`. Do not skip `okta.groups.manage` if you plan to add or remove users from groups - user lifecycle can succeed while group membership calls fail with 403.
6. Assign an admin role to the service app (**Admin roles** on the app). Use User Administrator (or equivalent) for lifecycle actions, and Group Administrator / Super Administrator (or a custom role with group membership permissions) when using `addUserToGroup` / `removeUserFromGroup`. Ensure the resource set covers the users and groups you will manage.
7. In {{kib}}, create the connector with Org URL, Token URL `https://your-okta-domain.okta.com/oauth2/v1/token`, Client ID, Key ID, and private key PEM.

### Turn off DPoP for the service app [okta-disable-dpop]

If **Test connector** fails with `invalid_dpop_proof` / `The DPoP proof JWT header is missing`, the service app requires DPoP and the connector cannot complete the token request.

1. In the Okta Admin Console open **Applications → Applications**.
2. Open your API Services app (for example the app you created for {{kib}}).
3. On the **General** tab, find **Proof of possession** (or similar).
4. Turn **off** **Require Demonstrating Proof of Possession (DPoP) header in token requests**.
5. Click **Save**.
6. In {{kib}}, run **Test connector** again.

Until {{kib}} adds DPoP support for Okta OAuth, leave this setting turned off for the service app used by the connector, or use the [SSWS API token](#okta-api-credentials) auth type instead.

### SSWS API token (fallback)

1. In the Admin Console go to **Security → API → Tokens**.
2. Create a token with an admin user that can manage users, groups, sessions, and read the System Log.
3. Paste the raw token into the connector (no `SSWS` prefix).
