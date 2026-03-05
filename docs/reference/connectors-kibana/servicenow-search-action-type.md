---
navigation_title: "ServiceNow"
type: reference
description: "Use the ServiceNow connector for federated search across incidents, knowledge articles, change requests, and other ServiceNow tables."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/servicenow-search-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# ServiceNow connector [servicenow-search-action-type]

The ServiceNow connector enables federated search capabilities across ServiceNow tables, including incidents, knowledge articles, change requests, and more, using the ServiceNow Table API.

::::{note}
This connector is designed for federated search.
For the ServiceNow ITSM, SecOps, and ITOM connectors used with alerting and cases, refer to [ServiceNow ITSM](/reference/connectors-kibana/servicenow-action-type.md), [ServiceNow SecOps](/reference/connectors-kibana/servicenow-sir-action-type.md), and [ServiceNow ITOM](/reference/connectors-kibana/servicenow-itom-action-type.md).
::::

## Create connectors in {{kib}} [define-servicenow-search-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [servicenow-search-connector-configuration]

ServiceNow connectors have the following configuration properties:

Instance URL
:   The URL of your ServiceNow instance (for example, `https://your-instance.service-now.com`).

Token URL
:   The OAuth 2.0 token endpoint URL for your ServiceNow instance (for example, `https://your-instance.service-now.com/oauth_token.do`).

Client ID
:   The OAuth client ID from your ServiceNow application registry.

Client Secret
:   The OAuth client secret for your ServiceNow application.


## Test connectors [servicenow-search-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.
The test verifies connectivity by querying the `sys_user` table, which is accessible to any authenticated user.

The ServiceNow connector has the following actions:

Search
:   Search for records in a ServiceNow table using full-text search.
    - **table** (required): The table to search. Common values: `incident`, `kb_knowledge`, `sc_req_item`, `change_request`, `problem`, `sc_task`, `cmdb_ci`. Custom tables are also supported.
    - **query** (required): The full-text search query string.
    - **encodedQuery** (optional): ServiceNow encoded query to combine with the full-text search for additional filtering (for example, `active=true^priority=1`). Uses `^` to AND conditions and `^OR` for OR.
    - **fields** (optional): Comma-separated list of fields to return.
    - **limit** (optional): Maximum number of results (default: 20).
    - **offset** (optional): Offset for pagination.

Get record
:   Retrieve a specific record by its sys_id. To retrieve a knowledge article with full content, use `table=kb_knowledge` and request fields: `sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category`.
    - **table** (required): The table containing the record.
    - **sysId** (required): The sys_id of the record.
    - **fields** (optional): Comma-separated list of fields to return.

List records
:   List records from a table with optional filtering.
    - **table** (required): The table to query. Common values: `incident`, `kb_knowledge`, `sc_req_item`, `change_request`, `problem`, `sc_task`, `cmdb_ci`. Custom tables are also supported.
    - **encodedQuery** (optional): ServiceNow encoded query for filtering (for example, `active=true^priority=1`).
    - **fields** (optional): Comma-separated list of fields to return.
    - **limit** (optional): Maximum number of results (default: 20).
    - **offset** (optional): Offset for pagination.
    - **orderBy** (optional): Field to order by (prefix with `-` for descending).

List knowledge bases
:   List available knowledge bases with their titles and descriptions. Use this to discover what knowledge bases exist before searching for articles.
    - **limit** (optional): Maximum number of results (default: 20).
    - **offset** (optional): Offset for pagination.

Get comments
:   Retrieve comments and work notes for a specific record. Useful for understanding the history and context of an incident, change request, or other record.
    - **tableName** (required): The table the record belongs to (for example, `incident`, `change_request`).
    - **recordSysId** (required): The sys_id of the record.
    - **limit** (optional): Maximum number of journal entries to return (default: 20).
    - **offset** (optional): Offset for pagination.

List tables
:   List available ServiceNow tables with their names and labels. Use this to discover what tables exist in the instance, especially for custom or unfamiliar ServiceNow configurations.
    - **query** (optional): Filter to search table names or labels (for example, `incident`, `CMDB`).
    - **limit** (optional): Maximum number of results (default: 50).
    - **offset** (optional): Offset for pagination.

Get attachment
:   Download a ServiceNow attachment and extract its text content. The extracted text is returned rather than raw binary data, making it suitable for use by AI agents. Supports PDFs, Word documents, spreadsheets, plain text, and other formats supported by the Elasticsearch attachment processor. To find attachment sys_ids, query the `sys_attachment` table using List records with `encodedQuery=table_name=<table>^table_sys_id=<record_sys_id>`.
    - **sysId** (required): The sys_id of the attachment (from the `sys_attachment` table).


## Get API credentials [servicenow-search-api-credentials]

To use the ServiceNow connector, you need to:

1. Create an OAuth application in ServiceNow:
   - Navigate to **System OAuth > Application Registry**
   - Click **New** and select **Create an OAuth API endpoint for external clients**
   - Provide a name for your application
   - Set the **Client Secret** (or let ServiceNow generate one)
   - Click **Submit**

2. Note the following values from the OAuth application:
   - **Client ID**: The auto-generated client ID
   - **Client Secret**: The secret you configured

3. Ensure the OAuth client has appropriate access:
   - The OAuth client must be associated with a user account that has read access to the tables you want to search
   - Common required roles: `itil` for incidents, `knowledge` for knowledge articles

4. Gather the following for the connector configuration:
   - **Instance URL**: Your ServiceNow instance URL (for example, `https://your-instance.service-now.com`)
   - **Token URL**: `https://your-instance.service-now.com/oauth_token.do`
   - **Client ID**: From step 2
   - **Client Secret**: From step 2
