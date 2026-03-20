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
:   The Consumer Key from your Salesforce Connected App.

Client Secret
:   The Consumer Secret from your Salesforce Connected App.

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

To use the Salesforce connector, you need a Connected App with OAuth 2.0 Client Credentials (or similar) turned on:

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
