---
navigation_title: "Zendesk"
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Zendesk data source connector [zendesk-action-type]

The Zendesk connector connects directly to the Zendesk API. It enables federated search of tickets, users, and 
organizations from Zendesk Support in Workplace AI and Agent Builder.

## Overview

This is a **custom connector** that uses Zendesk's REST API with Basic authentication (email + API token). 
You configure your Zendesk subdomain and credentials when creating the connector.

## Create connectors in {{kib}} [define-zendesk-ui]

You can create a Zendesk connector in **{{stack-manage-app}} > {{connectors-ui}}** or when adding a Zendesk 
data source.

### Connector configuration [zendesk-connector-configuration]

- **Subdomain** (required): Your Zendesk subdomain (e.g. `your-company` for https://your-company.zendesk.com).
- **Authentication**: Basic auth. Use your Zendesk account **email** and **API token** (from Admin Center > Apps 
and integrations > APIs > Zendesk API). For API token auth, the username must be in the form 
`your_email@example.com/token` and the password is your API token.

## Available actions [zendesk-available-actions]

| Action | Description |
|--------|-------------|
| **search** | Search across Zendesk (tickets, users, organizations). Parameters: `query` (required), `sortBy`, `sortOrder`, `page`, `perPage`. |
| **listTickets** | List tickets with pagination. Parameters: `page`, `perPage`. |
| **getTicket** | Get full details of a single ticket by ID. Parameters: `ticketId`. |
| **getTicketComments** | List comments on a ticket. Parameters: `ticketId` (required), `page`, `perPage`, `include`, `includeInlineImages`. |

## Get API credentials [zendesk-api-credentials]

1. Log in to your [Zendesk](https://www.zendesk.com/) account.
2. Go to **Admin Center** (gear icon) → **Apps and integrations** → **APIs** → **Zendesk API**.
3. Enable **Token access** and create a new API token.
4. Make sure that API access is enabled in the Admin UI under Apps and integrations > APIs > API Configuration
5. Copy the token and store it securely.
6. When configuring the connector: set the username to `your_email@example.com/token` and the password to the API token.

When creating or activating a Zendesk data source via script or API (including the "create new" flow with a single 
credential string), use the format `your_email@example.com/token:your_api_token`. The system parses this as Basic 
auth (username before the colon, password after) and creates the connector with the correct auth type. You must also 
provide the **subdomain** in the connector config (e.g. when creating the connector in the UI, or via API 
with `config: { subdomain: 'your-company' }`).
