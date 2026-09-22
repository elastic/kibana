---
navigation_title: "Salesforce"
type: reference
description: "Use the Salesforce connector to run SOQL and SOSL queries, fetch records, describe sobject metadata, and download files from your Salesforce org."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Salesforce connector [salesforce-action-type]

The Salesforce connector communicates with the Salesforce REST API to query and retrieve data from your Salesforce org. It supports SOQL queries, SOSL full-text search, fetching records by ID, listing records for standard and custom objects, retrieving sobject metadata (describe), and downloading file content from ContentVersion records.

## Create connectors in {{kib}} [define-salesforce-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [salesforce-connector-configuration]

The Salesforce connector supports **OAuth 2.0 Client Credentials** and **OAuth 2.0 authorization code** authentication in
{{kib}}. The fields you fill in depend on which auth type you select.

Token URL
:   The OAuth 2.0 token endpoint for your Salesforce instance. Use your **domain** plus `/services/oauth2/token`.
    Examples: `https://login.salesforce.com/services/oauth2/token` (production),
    `https://test.salesforce.com/services/oauth2/token` (sandbox), or
    `https://yourcompany.my.salesforce.com/services/oauth2/token` (My Domain).

Authorization URL
:   Required when you use **OAuth 2.0 authorization code** authentication. Use the same **domain** as for Token URL, with
    `/services/oauth2/authorize`. Examples: `https://login.salesforce.com/services/oauth2/authorize` (production),
    `https://test.salesforce.com/services/oauth2/authorize` (sandbox), or
    `https://yourcompany.my.salesforce.com/services/oauth2/authorize` (My Domain). Omit this when you use client
    credentials only.

Client ID
:   The **Consumer Key** from your Salesforce External Client App OAuth settings (see **Get API credentials**).

Client Secret
:   The **Consumer Secret** from your Salesforce External Client App OAuth settings.

The connector uses the token URL to obtain access tokens and to derive the instance base URL for API calls. The
authorization URL is used only for the browser-based authorization step in the authorization code flow.

## Test connectors [salesforce-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by running a simple SOQL query (`SELECT Id FROM User LIMIT 1`).

The Salesforce connector has the following actions:

Query
:   Run a SOQL query against Salesforce. Returns query results; for large result sets, the response may include `nextRecordsUrl` for pagination.
    - `soql` (required): A valid SOQL query string (for example, `SELECT Id, Name FROM Account LIMIT 10`).
    - `nextRecordsUrl` (optional): URL from a previous response to fetch the next page of results.

Search
:   Run a SOSL full-text search across one or more sobjects. Only searches objects you list in `returning`; custom objects must have "Allow Search" turned on. Results are capped at about 2000. Use the **describe** action or list objects first to discover valid object names.
    - `searchTerm` (required): Text to search for (for example, `Acme Corp` or `Q4 renewal`).
    - `returning` (required): Comma-separated sobject API names to search (for example, `Account,Contact,Opportunity`).
    - `nextRecordsUrl` (optional): URL from a previous response to fetch the next page of search results.

Get record
:   Retrieve a single record by object type and record ID.
    - `sobjectName` (required): The API name of the sobject (for example, `Account`, `Contact`, `Lead`).
    - `recordId` (required): The 18-character record ID.

List records
:   List records for a Salesforce sobject. Returns a page of record IDs; use `nextRecordsUrl` from the response to fetch the next page.
    - `sobjectName` (required): The API name of the sobject (for example, `Account`, `Contact`).
    - `limit` (optional): Maximum number of records to return. Default is 50; maximum is 2000.
    - `nextRecordsUrl` (optional): URL from a previous response to fetch the next page of results.

Describe
:   Get metadata for an sobject (fields, layout, and other describe information). Use this to discover field names and types before building SOQL queries or mapping data.
    - `sobjectName` (required): The API name of the sobject (for example, `Account`, `Contact`, `MyObject__c`).

Download file
:   Download file content from a ContentVersion record. Returns the file as base64 and the content-type header when present.
    - `contentVersionId` (required): The ContentVersion record ID (from a SOQL query or related record).

## Connector networking configuration [salesforce-connector-networking-configuration]

Use the **Action configuration settings** in the configuration reference for alerting to customize connector networking,
such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use
`xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [salesforce-api-credentials]

Use the following steps to obtain credentials for the connector’s OAuth 2.0 Client Credentials authentication. The
steps below are subject to change as the Salesforce UI updates.

### OAuth callback URL

Copy the pattern below into Salesforce **Callback URL**, replacing `<your-kibana-host>` with your {{kib}} public
hostname (no trailing slash before the path). 

```text
https://<your-kibana-host>/api/actions/connector/_oauth_callback
```

1. Log in to the Salesforce org you use for this integration (for example production, a sandbox, or another hosted
   instance). Open **Setup** from the **cog** in the upper-right corner.
2. In the left navigation, under **Platform Tools**, expand **Apps** > **External Client Apps**.
3. Open **External Client App Manager**, then select **New External Client App**.
4. On the form, set an **External Client App Name** (the label in the list; for example, `Elastic`) and an **API Name**
   (for example, `Elastic`). Complete any other required fields.
5. Under **OAuth Settings**, set **Callback URL** to the value from **OAuth callback URL**. Salesforce typically requires
   a callback URL when OAuth is enabled on the app. The connector’s **OAuth 2.0 Client Credentials** auth type uses the
   token endpoint only and does not redirect the browser to this URL; if you use the connector’s **OAuth 2.0
   authorization code** auth type instead, this URL must match what {{kib}} uses for the OAuth redirect.
6. Under **Available Scopes**, select at least:
   - **Manage user data via APIs (api)**
   - **Perform requests at any time (refresh_token, offline_access)**
7. Under **Flow Enablement**, enable the Salesforce option that matches the **authentication type** you choose when you
   create or edit this Salesforce connector in {{kib}}:
   - **OAuth 2.0 Client Credentials** — turn on **Enable Client Credentials Flow**. {{kib}} uses the OAuth 2.0 client
     credentials grant (`grant_type=client_credentials`) against your Token URL; no browser visit to the Authorization
     URL is required for this mode.
   - **OAuth 2.0 authorization code** — turn on **Enable Authorization Code and Credentials Flow** (or the equivalent
     label your Salesforce release uses for the authorization-code flow that uses `/services/oauth2/authorize` and your
     callback URL). {{kib}} drives the browser authorization step and exchanges the code at the Token URL.
   - To use **both** auth types with the **same** External Client App over time, enable **both** of the above options in
     Salesforce.
8. Under **Security**, ensure these options are selected (labels can vary slightly by release):
   - **Require secret for Web Server Flow**
   - **Request secret for Refresh Token Flow** (or **Require Secret for Refresh Token Flow**)
   - **Require Proof Key for Code Exchange (PKCE) extension for Supported Authorization Flows** when your org requires it.
9. **Save** the app.
10. **Client credentials policies:** Edit the app’s **Policies** (for example **Manage** > **Edit Policies**), set
    **Permitted Users** / pre-approval as your org requires (often **Admin approved users are pre-authorized**), and set
    **Run As** to the Salesforce user that owns API access for this integration (typically a dedicated integration user
    with least-privilege permission sets). Use Salesforce Help for current policy and **Run As** requirements for the
    client credentials flow in your org.
11. Open the app again, scroll to **OAuth Settings**, and select **Consumer Key and Secret**. Use **Consumer Key** as
    **Client ID** and **Consumer Secret** as **Client Secret** in the connector configuration in {{kib}}.
12. For **Token URL**, paste your org’s OAuth token endpoint (**domain** + `/services/oauth2/token`) into the connector
    in {{kib}}:
    - Production: `https://login.salesforce.com/services/oauth2/token`
    - Sandbox: `https://test.salesforce.com/services/oauth2/token`
    - My Domain: `https://yourcompany.my.salesforce.com/services/oauth2/token`
13. When you use **OAuth 2.0 authorization code** authentication in {{kib}}, also paste **Authorization URL** using the
    same **domain** as Token URL with `/services/oauth2/authorize`:
    - Production: `https://login.salesforce.com/services/oauth2/authorize`
    - Sandbox: `https://test.salesforce.com/services/oauth2/authorize`
    - My Domain: `https://yourcompany.my.salesforce.com/services/oauth2/authorize`
    Skip this when you use **OAuth 2.0 Client Credentials** only.

For more background, search Salesforce Help for **External Client Apps** and the **OAuth 2.0 client credentials flow**.
