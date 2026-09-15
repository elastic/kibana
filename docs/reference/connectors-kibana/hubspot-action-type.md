---
navigation_title: "HubSpot"
description: "Use the HubSpot connector to search and retrieve contacts, companies, deals, tickets, and engagements from HubSpot CRM."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# HubSpot connector [hubspot-action-type]

The HubSpot connector communicates with the HubSpot CRM API to search and retrieve contacts, companies, deals, tickets, and engagements from your HubSpot account.

## Create connectors in {{kib}} [define-hubspot-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [hubspot-connector-configuration]

HubSpot connectors support two authentication methods:

**Access token (bearer)**
:   Authenticates using a static token. Use a **Service Key** (recommended) from HubSpot Development, or a **Private App** access token (starts with `pat-`). See [Get API credentials](#hubspot-api-credentials) for both options.

    - **Private App Access Token**: The HubSpot access token.

**OAuth**
:   Authenticates via the OAuth 2.0 authorization code flow using a HubSpot Public App. Requires a **Client ID** and **Client Secret** from a HubSpot Public App. The authorization and token URLs are pre-filled; adjust the **Scopes** field if you need access beyond the defaults. See [OAuth (Public App)](#hubspot-oauth-public-app) for setup instructions.

## Test connectors [hubspot-action-configuration]

You can test connectors while creating or editing them in {{kib}}.

The HubSpot connector has the following actions:

**Search CRM Objects**
:   Search or list one HubSpot CRM object type. Omit **Query** to page through records.
    - **Object Type** (required): `contacts`, `companies`, `deals`, `tickets`, or an engagement type: `calls`, `emails`, `meetings`, `notes`, or `tasks`.
    - **Query** (optional): Keyword for search; omit to list records (with pagination).
    - **Properties** (optional): Property names to return (where supported).
    - **Limit** (optional): Maximum number of results to return (default: 10).
    - **Include Associated Deals** (optional): For `contacts` only—also returns linked deal IDs.

**Get CRM Object**
:   Retrieve the full details of a specific CRM record by its ID.
    - **Object Type** (required): Same values as **Search CRM Objects** (`contacts`, `companies`, `deals`, `tickets`, `calls`, `emails`, `meetings`, `notes`, or `tasks`).
    - **Object ID** (required): The unique HubSpot object ID of the record.
    - **Properties** (optional): Comma-separated list of property names to include in the response.

**Search Deals**
:   Search HubSpot deals with optional keyword, owner, pipeline, and stage filters.
    - **Query** (optional): Keyword to search for in deal names or properties.
    - **Owner ID** (optional): HubSpot owner ID (`hubspot_owner_id`) to filter deals by. Use the **List Owners** action to resolve an owner name to their ID.
    - **Pipeline** (optional): The HubSpot pipeline ID to filter deals by (for example, `default`). Use the **List Pipelines** action to discover valid pipeline IDs.
    - **Deal Stage** (optional): The deal stage ID to filter by (for example, `closedwon`, `closedlost`). Use the **List Pipelines** action to discover valid stage IDs.
    - **Limit** (optional): Maximum number of results to return (default: 10).

**Search Broad**
:   Run a single keyword search across contacts, companies, deals, and tickets simultaneously. Returns results grouped by object type.
    - **Query** (required): Keyword or phrase to search across all four object types in parallel.
    - **Limit** (optional): Maximum number of results per object type (default: 5).

**List Owners**
:   List HubSpot owners (users with CRM access) to discover who is assigned to contacts, companies, or deals.
    - **Limit** (optional): Maximum number of owners to return (default: 20).

**List Pipelines**
:   List HubSpot pipelines and their stages for deals or tickets. Use this to discover valid pipeline IDs and deal stage IDs before filtering with **Search Deals**.
    - **Object Type** (optional): The CRM object type to list pipelines for (`deals` or `tickets`). Defaults to `deals`.

## Connector networking configuration [hubspot-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [hubspot-api-credentials]

The connector supports three credential types: a Service Key (recommended for token auth), a Private App access token (legacy token auth), or OAuth via a Public App. Use a Service Key or OAuth when possible.

### Service Key (recommended) [hubspot-service-key]

Service Keys are managed under **Development** in HubSpot and can call the same CRM APIs with the scopes you assign.

1. Log in to your [HubSpot account](https://app.hubspot.com/).
2. In the main navigation, go to **Development**, then **Keys** (or **Settings → Development → Keys**).
3. Create a new key or select an existing one, and choose **Service Key** (or the equivalent key type that supports CRM scopes).
4. Under **Scopes**, grant at least the following (minimum for connector actions such as Search CRM Objects, Get CRM Object, List Owners, Search Deals, List Pipelines):
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
   - `tickets`
   - `crm.objects.owners.read`
5. If you use **List Pipelines**, also add (if available):
   - `crm.schemas.companies.read`
   - `crm.schemas.contacts.read`
   - `crm.schemas.deals.read`
6. Save the key and copy the generated token (it can start with `pat-` or another prefix).
7. Use this value as the **Private App Access Token** when configuring the HubSpot connector in {{kib}}.

### Private App (legacy) [hubspot-private-app-legacy]

Creating a Private App (app integration) is the **legacy** way to obtain a token. Use this option if you need engagement read scopes (notes, calls, emails, meetings, tasks via **Search CRM Objects**), or if Service Keys are not available for your account. HubSpot may restrict or remove the ability to create new Private Apps in some accounts.

1. Log in to your [HubSpot account](https://app.hubspot.com/).
2. Select the **Settings** icon in the top navigation bar.
3. In the left sidebar, select **Integrations → Private Apps**.
4. Select **Create a private app**.
5. On the **Basic Info** tab, give your app a name (for example, "Elastic Workplace AI").
6. Go to the **Scopes** tab and add at least:
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
   - `tickets`
   - `crm.objects.owners.read`
   For engagement types in **Search CRM Objects**, also add scopes such as `sales-email-read` (emails) and any engagement read scopes your account offers for notes, calls, and meetings.
7. Select **Create app** and confirm by selecting **Continue Creating**.
8. On the confirmation dialog, copy the **Access Token** (starts with `pat-`).
9. Use this token as the **Private App Access Token** when configuring the connector in {{kib}}.

### OAuth (Public App) [hubspot-oauth-public-app]

OAuth uses the authorization code flow with a HubSpot Public App. Unlike Private Apps, Public Apps are registered in a HubSpot developer account and support OAuth on behalf of any HubSpot portal.

1. Log in to your [HubSpot developer account](https://developers.hubspot.com/).
2. Select **Apps** in the top navigation, then select **Create app** (or open an existing app).
3. On the **App Info** tab, give your app a name (for example, "Elastic Workplace AI").
4. On the **Auth** tab, under **Redirect URLs**, add your {{kib}} OAuth callback URL:
   `https://<your-kibana-host>/api/actions/connector/_oauth_callback`
5. Under **Scopes**, add at least:
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
   - `tickets`
   - `crm.objects.owners.read`
6. Save the app. On the **Auth** tab, copy the **Client ID** and **Client Secret**.
7. In {{kib}}, create a HubSpot connector and select **OAuth** as the authentication type. Enter the **Client ID** and **Client Secret**. Adjust the **Scopes** field if needed, then complete the OAuth authorization flow.

:::{note}
Keep your access token secure. Anyone with this token can access your HubSpot CRM data.
:::
