---
navigation_title: "HubSpot"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/hubspot-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# HubSpot connector [hubspot-action-type]

The HubSpot connector communicates with the HubSpot CRM API to search and retrieve contacts, companies, deals, tickets, and engagements from your HubSpot account.

## Create connectors in {{kib}} [define-hubspot-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [hubspot-connector-configuration]

HubSpot connectors have the following configuration properties:

Private App Access Token
:   The HubSpot private app access token (starts with `pat-`) used for authentication. You can obtain this by creating a private app in your HubSpot account settings.

## Test connectors [hubspot-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The HubSpot connector has the following actions:

Search CRM Objects
:   Search HubSpot CRM records by keyword across contacts, companies, deals, or tickets.
    - **Object Type** (required): The type of CRM record to search (`contacts`, `companies`, `deals`, or `tickets`).
    - **Query** (required): The search keyword to match against record properties.
    - **Limit** (optional): Maximum number of results to return (default: 10).

Get CRM Object
:   Retrieve the full details of a specific CRM record by its ID.
    - **Object Type** (required): The type of CRM record (`contacts`, `companies`, `deals`, or `tickets`).
    - **Object ID** (required): The unique HubSpot object ID of the record.
    - **Properties** (optional): Comma-separated list of property names to include in the response.

Search Deals
:   Search HubSpot deals with optional keyword, pipeline, and stage filters.
    - **Query** (optional): Keyword to search for in deal names or properties.
    - **Pipeline** (optional): The HubSpot pipeline ID to filter deals by (e.g. `default`).
    - **Deal Stage** (optional): The deal stage ID to filter by (e.g. `closedwon`, `closedlost`).
    - **Limit** (optional): Maximum number of results to return (default: 10).

Search Engagements
:   Search or list HubSpot engagement records such as notes, emails, calls, meetings, or tasks.
    - **Engagement Type** (optional): The type of engagement (`calls`, `emails`, `meetings`, `notes`, or `tasks`). Defaults to `notes`.
    - **Query** (optional): Search keyword to filter engagements.
    - **Limit** (optional): Maximum number of results to return (default: 10).

List Owners
:   List HubSpot owners (users with CRM access) to discover who is assigned to contacts, companies, or deals.
    - **Limit** (optional): Maximum number of owners to return (default: 20).

## Connector networking configuration [hubspot-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [hubspot-api-credentials]

To use the HubSpot connector, you need to create a private app and obtain its access token:

1. Log in to your [HubSpot account](https://app.hubspot.com/).
2. Click the **Settings** icon (gear icon) in the top navigation bar.
3. In the left sidebar, navigate to **Integrations > Private Apps**.
4. Click **Create a private app**.
5. On the **Basic Info** tab, give your app a name (e.g. "Elastic Workplace AI").
6. Go to the **Scopes** tab and add the following scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
   - `crm.objects.tickets.read`
   - `crm.objects.owners.read`
   - `sales-email-read` (for email engagements)
7. Click **Create app** and confirm by clicking **Continue Creating**.
8. On the confirmation dialog, copy the **Access Token** (starts with `pat-`).
9. Use this token as the **Private App Access Token** when configuring the connector in {{kib}}.

:::note
Keep your access token secure. Anyone with this token can access your HubSpot CRM data.
:::
