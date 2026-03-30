---
navigation_title: "Confluence Cloud"
type: reference
description: "Use the Confluence Cloud connector to search and retrieve pages and spaces from your Confluence Cloud site using the REST API v2."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Confluence Cloud connector [confluence-cloud-action-type]

The Confluence Cloud connector communicates with the Confluence Cloud REST API v2 to list and retrieve spaces and pages. It uses Basic authentication (email and API token) and connects to your Atlassian site by subdomain.

## Create connectors in {{kib}} [define-confluence-cloud-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [confluence-cloud-connector-configuration]

Confluence Cloud connectors have the following configuration properties:

Account email
:   Your Atlassian account email address used for Basic authentication.

Subdomain
:   Your Atlassian subdomain (for example, `your-domain` for `https://your-domain.atlassian.net`).

API token
:   Your Atlassian API token for authentication. Refer to [Get API credentials](#confluence-cloud-api-credentials) for instructions.

## Test connectors [confluence-cloud-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Confluence Cloud connector has the following actions:

List pages
:   List Confluence pages with optional filters and cursor-based pagination.
    - `limit` (optional): Maximum number of pages to return.
    - `cursor` (optional): Pagination cursor from a previous response.
    - `spaceId` (optional): Space ID or list of space IDs to filter by.
    - `title` (optional): Filter pages by title (partial match).
    - `status` (optional): Page status filter (for example, `current`, `archived`, `draft`).
    - `bodyFormat` (optional): Format for page body in the response (for example, `atlas_doc_format`, `storage`).

Get page
:   Retrieve full details of a single Confluence page by ID.
    - `id` (required): The ID of the page to retrieve.
    - `bodyFormat` (optional): Format for page body in the response.

List spaces
:   List Confluence spaces with optional filters and cursor-based pagination.
    - `limit` (optional): Maximum number of spaces to return.
    - `cursor` (optional): Pagination cursor from a previous response.
    - `ids` (optional): Space ID or list of space IDs to filter by.
    - `keys` (optional): Space key or list of space keys to filter by (for example, `DEMO`, `TEAM`).
    - `type` (optional): Space type filter (for example, `global`, `personal`).
    - `status` (optional): Space status filter (for example, `current`, `archived`).

Get space
:   Retrieve full details of a single Confluence space by ID.
    - `id` (required): The ID of the space to retrieve.

## Connector networking configuration [confluence-cloud-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [confluence-cloud-api-credentials]

To use the Confluence Cloud connector, you need an Atlassian API token:

1. Log in to your [Atlassian account](https://id.atlassian.com/).
2. Go to **Security** > **API tokens** (or open [API token management](https://id.atlassian.com/manage-profile/security/api-tokens) directly).
3. Select **Create API token**.
4. Enter a label (for example, `Kibana Confluence connector`) and select **Create**.
5. Copy the token and store it securely. Enter this value as the **API token** when configuring the connector in {{kib}}. The email address associated with your Atlassian account is used as the username for Basic authentication.
