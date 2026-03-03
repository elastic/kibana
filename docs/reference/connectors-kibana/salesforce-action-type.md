---
navigation_title: "Salesforce"
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Salesforce connector [salesforce-action-type]

The Salesforce connector communicates with the Salesforce REST API to query and retrieve data from your Salesforce org. It supports SOQL queries, fetching records by ID, and listing records for standard and custom objects.

## Create connectors in {{kib}} [define-salesforce-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [salesforce-connector-configuration]

Salesforce connectors use OAuth 2.0 Client Credentials and have the following configuration properties:

Token URL
:   The OAuth 2.0 token endpoint for your Salesforce instance. The value is your **domain name** plus `/services/oauth2/token`. Examples: `https://login.salesforce.com/services/oauth2/token` (production), `https://test.salesforce.com/services/oauth2/token` (sandbox), or `https://yourcompany.my.salesforce.com/services/oauth2/token` (My Domain).

Client ID
:   The Consumer Key from your Salesforce Connected App.

Client Secret
:   The Consumer Secret from your Salesforce Connected App.

The connector uses the token URL to both obtain an access token and derive the instance base URL for API calls.

## Test connectors [salesforce-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by running a simple SOQL query (`SELECT Id FROM User LIMIT 1`).

The Salesforce connector has the following actions:

Search
:   Run a SOQL query against Salesforce. Returns query results; for large result sets, the response may include `nextRecordsUrl` for pagination.
    - **soql** (required): A valid SOQL query string (for example, `SELECT Id, Name FROM Account LIMIT 10`).

Get record
:   Retrieve a single record by object type and record ID.
    - **sobjectName** (required): The API name of the sobject (for example, `Account`, `Contact`, `Lead`).
    - **recordId** (required): The 18-character record ID.

List records
:   List records for a Salesforce sobject. Returns a page of record IDs; use `nextRecordsUrl` from the response to fetch the next page.
    - **sobjectName** (required): The API name of the sobject (for example, `Account`, `Contact`).
    - **limit** (optional): Maximum number of records to return. Default is 50; maximum is 2000.

## Connector networking configuration [salesforce-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [salesforce-api-credentials]

To use the Salesforce connector, you need a Connected App with OAuth 2.0 Client Credentials (or similar) enabled:

1. Log in to [Salesforce](https://www.salesforce.com/) and open **Setup**.
2. In the Quick Find box, search for **App Manager** and open it.
3. Click **New Connected App**.
4. Enable **Enable OAuth Settings**.
5. Under **OAuth and OpenID Connect Settings**:
   - Add a **Callback URL** (required by Salesforce; the connector uses the client credentials flow).
   - Under **Selected OAuth Scopes**, add at least: **Access and manage your data (api)**, **Perform requests at any time (refresh_token, offline_access)**, and **Provide access to your data via the Web (web)** as needed for your use case.
   - Enable **Enable Client Credentials Flow** if your org supports it (required for server-to-server integration).
6. Save the app. Wait a few minutes for the app to be activated, then click **Manage Consumer Details** and verify or set the **Consumer Key** (Client ID) and **Consumer Secret** (Client Secret).
7. Use the **Consumer Key** as Client ID and **Consumer Secret** as Client Secret when creating the connector in Kibana.
8. For Token URL, use the formula **domain name** + `/services/oauth2/token`:
   - Production: `https://login.salesforce.com` + `/services/oauth2/token` → `https://login.salesforce.com/services/oauth2/token`
   - Sandbox: `https://test.salesforce.com` + `/services/oauth2/token` → `https://test.salesforce.com/services/oauth2/token`
   - My Domain: `https://yourcompany.my.salesforce.com` + `/services/oauth2/token` → `https://yourcompany.my.salesforce.com/services/oauth2/token`
