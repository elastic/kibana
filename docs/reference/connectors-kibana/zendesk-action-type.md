---
navigation_title: "Zendesk"
type: reference
description: "Use the Zendesk connector to search and retrieve tickets, users, organizations, and Help Center articles using the Zendesk API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Zendesk data source connector [zendesk-action-type]

The Zendesk connector connects directly to the Zendesk API. It enables federated search of tickets, users, and organizations from Zendesk Support in Agent Builder.

You can use this connector in **Agent Builder** and **Workflows**.

## Overview

The Zendesk connector uses Zendesk's REST API with OAuth. You can authorize through the OAuth authorization code flow or paste an OAuth access token. You configure your Zendesk subdomain and credentials when creating the connector.

## Create connectors in {{kib}} [define-zendesk-ui]

You can create a Zendesk connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding a Zendesk data source.

### Connector configuration [zendesk-connector-configuration]

Subdomain
:   Your Zendesk subdomain (for example, `your-company` for `https://your-company.zendesk.com`).

Authentication
:   Choose **OAuth Authorization Code** or **OAuth access token**. Refer to [Get API credentials](#zendesk-api-credentials) for setup. Email and API token (Basic authentication) is no longer supported because the Zendesk API reference no longer accepts it for the endpoints the connector calls. Connectors that used it need to be recreated with one of these options.

## Available actions [zendesk-available-actions]

| Action | Description |
|--------|-------------|
| `search` | Search across Zendesk (tickets, users, organizations). Parameters: `query` (required), `sortBy`, `sortOrder`, `page`, `perPage`. |
| `listTickets` | List tickets with pagination. Parameters: `page`, `perPage`. |
| `getTicket` | Get full details of a single ticket by ID. Parameters: `ticketId`. |
| `getTicketComments` | List comments on a ticket. Parameters: `ticketId` (required), `page`, `perPage`, `include`, `includeInlineImages`. |

## Connector networking configuration [zendesk-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [zendesk-api-credentials]

Both options use an OAuth client registered in your Zendesk account. Zendesk shows the client secret only once, so store it securely.

### OAuth Authorization Code (recommended) [zendesk-oauth-credentials]

Use this method to authorize the connector with your Zendesk account through the OAuth authorization code flow. {{kib}} requests the `read` and `tickets:read` scopes.

1. Log in to your [Zendesk](https://www.zendesk.com/) account as an admin.
2. Go to **Admin Center** > **Apps and integrations** > **APIs** > **OAuth Clients** and add an OAuth client.
3. Set **Client kind** to **Confidential**, and set the redirect URL to `https://<your-kibana-host>/api/actions/connector/_oauth_callback`.
4. Save the client, then copy the **Unique identifier** (the client ID) and the **Secret**.
5. In {{kib}}, create a Zendesk connector, enter your subdomain, and select **OAuth Authorization Code** as the authentication method. Enter:
   - **Authorization URL**: `https://<subdomain>.zendesk.com/oauth/authorizations/new`
   - **Token URL**: `https://<subdomain>.zendesk.com/oauth/tokens`
   - **Client ID** and **Client Secret** from step 4.
6. Authorize with your Zendesk account to complete the OAuth flow.

Refer to the [Zendesk OAuth documentation](https://developer.zendesk.com/api-reference/ticketing/oauth/grant_type_tokens/) for details.

### OAuth access token [zendesk-bearer-credentials]

Use this method if you already have a Zendesk OAuth access token, for example for quick testing or automated setup. The token needs the `read` scope. Create an OAuth client as described above (the redirect URL is not used), generate an access token for it, and paste the token into the **OAuth access token** field. An access token is not refreshed, so you need to replace it when it expires or is revoked.

When creating a Zendesk data source through a script or API, create the connector with `config: { subdomain: 'your-company' }` and the `bearer` authentication type with your access token as the `token` secret.
