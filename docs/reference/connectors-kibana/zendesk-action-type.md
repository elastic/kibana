---
navigation_title: "Zendesk"
type: reference
description: "Use the Zendesk connector to search and retrieve tickets, users, organizations, and Help Center articles using the Zendesk API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Zendesk data source connector [zendesk-action-type]

The Zendesk connector connects directly to the Zendesk API. It enables federated search of tickets, users, and organizations from Zendesk Support in Workplace AI and Agent Builder.

## Overview

This is a **custom connector** that uses Zendesk's REST API with Basic authentication (email and API token). You configure your Zendesk subdomain and credentials when creating the connector.

## Create connectors in {{kib}} [define-zendesk-ui]

You can create a Zendesk connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding a Zendesk data source.

### Connector configuration [zendesk-connector-configuration]

Subdomain
:   Your Zendesk subdomain (for example, `your-company` for `https://your-company.zendesk.com`).

Authentication
:   Basic authentication. Use your Zendesk account **email** and **API token** (from **Admin Center** > **Apps and integrations** > **APIs** > **Zendesk API**). For API token authentication, the username must be in the form `your_email@example.com/token` and the password is your API token.

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

1. Log in to your [Zendesk](https://www.zendesk.com/) account.
2. Go to **Admin Center** > **Apps and integrations** > **APIs** > **Zendesk API**.
3. Turn on **Token access** and create a new API token.
4. Verify that API access is turned on under **Apps and integrations** > **APIs** > **API Configuration**.
5. Copy the token and store it securely.
6. When configuring the connector, in the **Username** field enter `your_email@example.com/token`. In the **Password** field, enter the API token.

When creating or activating a Zendesk data source through a script or API (including the "create new" flow with a single credential string), use the format `your_email@example.com/token:your_api_token`. Kibana parses this as Basic authentication credentials (username before the colon, password after) and creates the connector with the correct authentication type. Provide the `subdomain` in the connector configuration (for example, when creating the connector in the UI, or through the API with `config: { subdomain: 'your-company' }`).
