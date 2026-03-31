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

Salesforce connectors use OAuth 2.0 Client Credentials and have the following configuration properties:

Token URL
:   The OAuth 2.0 token endpoint for your Salesforce instance. The value is your **domain name** plus `/services/oauth2/token`. Examples: `https://login.salesforce.com/services/oauth2/token` (production), `https://test.salesforce.com/services/oauth2/token` (sandbox), or `https://yourcompany.my.salesforce.com/services/oauth2/token` (My Domain).

Client ID
:   The **Consumer Key** from a Salesforce OAuth app you register using a [Connected App](#salesforce-connected-app-credentials) or an [External Client App](#salesforce-external-client-app-credentials).

Client Secret
:   The **Consumer Secret** from that Connected App or External Client App.

The connector uses the token URL to both obtain an access token and derive the instance base URL for API calls.

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

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [salesforce-api-credentials]

To use the Salesforce connector, you need a Salesforce OAuth app (a **Connected App** or an **External Client App**) with OAuth 2.0 Client Credentials enabled, then you copy the **Consumer Key** and **Consumer Secret** into the connector in {{kib}}.

### Connected App [salesforce-connected-app-credentials]

1. Log in to [Salesforce](https://www.salesforce.com/) and open **Setup**.
2. In the **Quick Find** box, search for **App Manager** and open it.
3. Select **New Connected App**.
4. Select the **Enable OAuth Settings** checkbox.
5. Under **OAuth and OpenID Connect Settings**:
   - Add a **Callback URL** (required by Salesforce; the connector uses the client credentials flow).
   - Under **Selected OAuth Scopes**, add at least: **Access and manage your data (api)**, **Perform requests at any time (refresh_token, offline_access)**, and **Provide access to your data via the Web (web)** as needed for your use case.
   - Select the **Enable Client Credentials Flow** checkbox if your org supports it (required for server-to-server integration).
6. Save the app.
7. Wait a few minutes for the app to be activated, then select **Manage Consumer Details** and verify or set the **Consumer Key** (Client ID) and **Consumer Secret** (Client Secret).
8. Enter the **Consumer Key** as Client ID and **Consumer Secret** as Client Secret when creating the connector in {{kib}}.
9. For Token URL, use the formula **domain name** + `/services/oauth2/token`:
   - Production: `https://login.salesforce.com/services/oauth2/token`
   - Sandbox: `https://test.salesforce.com/services/oauth2/token`
   - My Domain: `https://yourcompany.my.salesforce.com/services/oauth2/token`

For client credentials, also complete any **Policies** steps Salesforce requires for your org (for example **Run As** user and admin pre-approval). See [Setting up a Connected App for the Client Credential Flow](https://help.salesforce.com/s/articleView?id=sf.connected_app_client_credentials_setup.htm&type=5).

### External Client App [salesforce-external-client-app-credentials]

1. Log in to [Salesforce](https://www.salesforce.com/), click the **cog** in the upper-right corner, and select **Setup**.
2. In the left navigation, under **Platform Tools**, expand **Apps** > **External Client Apps**.
3. Open **External Client App Manager**, then select **New External Client App**.
4. On the form, set an **External Client App Name** (the label in the list; for example, `Elastic`) and an **API Name** (for example, `Elastic`). Complete any other required fields.
5. Under **OAuth Settings**, set the **Callback URL** to your {{kib}} instance’s OAuth callback endpoint:
   `https://<your-kibana-host>/api/actions/connector/_oauth_callback`
   Replace `<your-kibana-host>` with your deployment’s hostname (no trailing slash before the path). Salesforce typically requires a callback URL when OAuth is enabled on the app. The connector’s **OAuth 2.0 Client Credentials** auth type uses the token endpoint only and does not redirect the browser to this URL; if you use the connector’s **OAuth 2.0 authorization code** auth type instead, this URL must match what {{kib}} uses for the OAuth redirect.
6. Under **Available Scopes**, select at least:
   - **Access the identity URL service (id, profile, email, address, phone)**
   - **Manage user data via APIs (api)**
   - **Perform requests at any time (refresh_token, offline_access)**
   - **Access content resources (content)**
   - **Access the Salesforce API Platform (sfap_api)**
7. Under **Flow Enablement**, select the options your Salesforce release shows for the **client credentials** grant—often **Enable Client Credentials Flow** and/or **Enable Authorization Code and Credentials Flow** for External Client Apps.
8. Under **Security**, ensure these options are selected (labels can vary slightly by release):
   - **Require secret for Web Server Flow**
   - **Request secret for Refresh Token Flow** (or **Require Secret for Refresh Token Flow**)
   - **Require Proof Key for Code Exchange (PKCE) extension for Supported Authorization Flows** when your org requires it.
9. **Save** the app.
10. **Client credentials policies:** Edit the app’s **Policies** (for example **Manage** > **Edit Policies**), set **Permitted Users** / pre-approval as your org requires (often **Admin approved users are pre-authorized**), and set **Run As** to the Salesforce user that owns API access for this integration (typically a dedicated integration user with least-privilege permission sets). See [Invoke REST APIs with the Integration User and OAuth Client Credentials](https://developer.salesforce.com/blogs/2024/02/invoke-rest-apis-with-the-salesforce-integration-user-and-oauth-client-credentials).
11. Open the app again, scroll to **OAuth Settings**, and select **Consumer Key and Secret**. Use **Consumer Key** as **Client ID** and **Consumer Secret** as **Client Secret** in the connector configuration in {{kib}}.
12. For **Token URL**, use your org’s OAuth token endpoint (**domain** + `/services/oauth2/token`):
    - Production: `https://login.salesforce.com/services/oauth2/token`
    - Sandbox: `https://test.salesforce.com/services/oauth2/token`
    - My Domain: `https://yourcompany.my.salesforce.com/services/oauth2/token`

For more background, see [External Client Apps](https://help.salesforce.com/s/articleView?id=sf.external_client_apps.htm&type=5) and the [client credentials flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_client_credentials_flow.htm&type=5) in Salesforce Help.
