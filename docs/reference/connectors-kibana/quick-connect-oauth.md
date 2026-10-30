---
navigation_title: Quick Connect OAuth 2.0
type: overview
description: "Use Quick Connect OAuth 2.0 to authorize supported Kibana connectors without registering your own OAuth app."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Quick Connect OAuth 2.0 [quick-connect-oauth]

Quick Connect OAuth 2.0 is an authentication option for {{kib}} connectors that removes the need to create and manage your own OAuth app. Elastic hosts and maintains the OAuth app for each supported service. Select **Quick Connect OAuth 2.0** when you create the connector, then sign in to the service and authorize access.

With other OAuth-based authentication types, you register an app with the service provider, configure scopes and redirect URIs, and copy a client ID and client secret into {{kib}}. Quick Connect OAuth 2.0 skips those steps.

## Supported connectors [quick-connect-oauth-supported-connectors]

The following connectors support Quick Connect OAuth 2.0:

| Connector | Access granted |
| --- | --- |
| [Gmail](/reference/connectors-kibana/gmail-action-type.md) | Read-only. Write actions require OAuth 2.0 authorization code authentication. |
| [Google Calendar](/reference/connectors-kibana/google-calendar-action-type.md) | Read-only access to calendars and events. |
| [Google Drive](/reference/connectors-kibana/google-drive-action-type.md) | Read-only access to files and file metadata. |
| [Slack (v2)](/reference/connectors-kibana/slack-v2-action-type.md) | Search and read messages, channels, users, and files, and send messages. |
| [Microsoft Teams](/reference/connectors-kibana/microsoft-teams-action-type.md) | Read teams, channels, chats, and messages, and send messages. |
| [SharePoint Online](/reference/connectors-kibana/sharepoint-online-action-type.md) | Read-only access to sites and files. |

## Set up a connector with Quick Connect OAuth 2.0 [quick-connect-oauth-setup]

1. In {{kib}}, go to **{{stack-manage-app}} → {{connectors-ui}}** and create a connector for one of the [supported services](#quick-connect-oauth-supported-connectors).
2. For the authentication type, select **Quick Connect OAuth 2.0**.
3. Follow the prompt to sign in to the service and authorize the Elastic app to access your organization's data.

You don't enter a client ID, client secret, redirect URI, or scopes. {{kib}} stores the resulting tokens and refreshes them automatically.

### Authorization might require your IT administrator [quick-connect-oauth-admin-approval]

Your organization might restrict which third-party apps can access company data. If you see a message indicating that you need approval, ask your administrator to approve the Elastic app, then authorize the connector again.

Depending on the service, administrators typically need to:

Google Workspace (Gmail, Google Calendar, Google Drive)
:   Allow the Elastic app in the Google Workspace admin console if your organization restricts third-party app access.

Microsoft 365 (Microsoft Teams, SharePoint Online)
:   Grant tenant-wide admin consent for the Elastic app in Microsoft Entra ID if user consent is turned off. For SharePoint Online, an administrator might also need to grant the app access to specific sites.

Slack
:   Approve the app for the workspace if your workspace requires app approval.

## How it works [quick-connect-oauth-how-it-works]

- Per-user access: The connector acts as the user who authorized it, so it can only access data that user can access.
- Fixed scopes: The permissions are predefined for each connector and can't be changed. If you need different scopes, or access that Quick Connect OAuth 2.0 doesn't grant, use the OAuth 2.0 authorization code authentication type with your own app.
- Token refresh: {{kib}} refreshes access tokens automatically. If you revoke the authorization or it expires, re-authorize the connector from the connectors list.

## When to use another authentication type [quick-connect-oauth-choose]

Quick Connect OAuth 2.0 is the recommended option for connectors that support it. Use another authentication type if you need to:

- Run write actions that Quick Connect OAuth 2.0 doesn't allow, such as Gmail write actions.
- Control the OAuth app, its name, or its scopes.
- Run the connector with one shared account instead of each person's own account, for example, with OAuth client credentials (app-only access).

To compare the authentication types for a connector, refer to its page in [Supported connectors](#quick-connect-oauth-supported-connectors).
