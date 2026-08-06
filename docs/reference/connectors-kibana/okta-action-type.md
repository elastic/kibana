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

## Create connectors in {{kib}} [define-okta-ui]

You can create an Okta connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [okta-connector-configuration]

Org URL
:   Base URL of your Okta organization, for example `https://your-okta-domain.okta.com` or `https://your-okta-domain.oktapreview.com`. Custom domains are supported. Do not include `/api/v1`.

Authentication
:   **Recommended:** OAuth 2.0 client credentials with private-key JWT. Provide the Token URL (`https://your-okta-domain.okta.com/oauth2/v1/token`), Client ID, Key ID (`kid`), and PEM private key. The connector requests scopes `okta.users.manage`, `okta.groups.manage`, and `okta.logs.read`.
:   **Fallback:** SSWS API token from **Security > API > Tokens**. Paste the raw token value; the connector sends `Authorization: SSWS` automatically. Token privileges must allow the same user lifecycle, group, and System Log operations as the OAuth scopes above.

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
| `listUsers` | List users with pagination/sort. Parameters: `limit`, `after`, `sortBy`, `sortOrder`. |
| `searchUsers` | Find users by `q`, `search`, or `filter` (do not combine `search` and `filter`). Parameters: `q`, `search`, `filter`, `limit`, `after`. |
| `getLogs` | Query System Log events. Parameters: `since`, `until`, `filter`, `q`, `limit`, `sortOrder`, `after`. |

## Required permissions [okta-required-permissions]

Grant these OAuth scopes on the service app (or equivalent admin privileges for an SSWS token): `okta.users.manage`, `okta.groups.manage`, and `okta.logs.read`. Assign an admin role to the OAuth service app (for example User Administrator or a custom role with lifecycle and group permissions). Session revoke uses `okta.users.manage`.

## Connector networking configuration [okta-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [okta-api-credentials]

### OAuth service app (recommended)

1. Sign in to the Okta Admin Console with privileges to create apps and grant Okta API scopes.
2. Create an **API Services** app integration (**Applications > Applications > Create App Integration**).
3. Set client authentication to **Public key / Private key**, register your public JWKS key (note the `kid`), and store the matching private key securely.
4. On **Okta API Scopes**, grant `okta.users.manage`, `okta.groups.manage`, and `okta.logs.read`.
5. Assign an admin role to the service app (**Admin roles** on the app).
6. In {{kib}}, create the connector with Org URL, Token URL `https://your-okta-domain.okta.com/oauth2/v1/token`, Client ID, Key ID, and private key PEM.

### SSWS API token (fallback)

1. In the Admin Console go to **Security > API > Tokens**.
2. Create a token with an admin user that can manage users, groups, sessions, and read the System Log.
3. Paste the raw token into the connector (no `SSWS` prefix).
