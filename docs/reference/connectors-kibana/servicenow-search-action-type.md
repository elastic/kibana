---
navigation_title: "ServiceNow"
type: reference
description: "Use the ServiceNow connector to search, read, and write records, incidents, security incidents, events, and attachments in ServiceNow."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# ServiceNow connector [servicenow-search-action-type]

The ServiceNow connector enables both federated search and write operations against ServiceNow tables using the ServiceNow Table API. It supports full-text search, record retrieval, incident management, Security Operations incidents, ITOM Event Management, attachment handling, and generic record create/update/delete operations.

::::{note}
For the ServiceNow ITSM, SecOps, and ITOM connectors used with alerting and cases, refer to [ServiceNow ITSM](/reference/connectors-kibana/servicenow-action-type.md), [ServiceNow SecOps](/reference/connectors-kibana/servicenow-sir-action-type.md), and [ServiceNow ITOM](/reference/connectors-kibana/servicenow-itom-action-type.md).
::::

## Create connectors in {{kib}} [define-servicenow-search-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [servicenow-search-connector-configuration]

ServiceNow connectors support **OAuth 2.0 Client Credentials** and **OAuth 2.0 Authorization Code** authentication. Select the authentication type when you create or edit the connector.

Instance URL
:   The URL of your ServiceNow instance (for example, `https://your-instance.service-now.com`).

#### OAuth 2.0 Client Credentials

Token URL
:   The OAuth 2.0 token endpoint URL for your ServiceNow instance (for example, `https://your-instance.service-now.com/oauth_token.do`).

Client ID
:   The OAuth client ID from your ServiceNow application registry.

Client Secret
:   The OAuth client secret for your ServiceNow application.

#### OAuth 2.0 Authorization Code

Client ID
:   The OAuth client ID from your ServiceNow application registry. Refer to [OAuth Authorization Code setup](#servicenow-search-oauth-auth-code).

Client Secret
:   The OAuth client secret for your ServiceNow application.

The connector automatically uses the correct ServiceNow OAuth endpoints for your instance (`https://<your-instance>.service-now.com/oauth_auth.do` for authorization and `https://<your-instance>.service-now.com/oauth_token.do` for token exchange). The connector handles scopes automatically.

## Test connectors [servicenow-search-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.
The test verifies connectivity by querying the `sys_user` table, which any authenticated user can access.

The ServiceNow connector has the following actions:

Search
:   Search for records in a ServiceNow table using full-text search.
    - `table` (required): The table to search. Common values: `incident`, `kb_knowledge`, `sc_req_item`, `change_request`, `problem`, `sc_task`, `cmdb_ci`. Custom tables are also supported.
    - `query` (required): The full-text search query string.
    - `encodedQuery` (optional): ServiceNow encoded query to combine with the full-text search for additional filtering (for example, `active=true^priority=1`). Uses `^` to AND conditions and `^OR` for OR.
    - `fields` (optional): Comma-separated list of fields to return.
    - `limit` (optional): Maximum number of results (default: 20).
    - `offset` (optional): Offset for pagination.

Get record
:   Retrieve a specific record by its `sys_id`. To retrieve a knowledge article with full content, use `table=kb_knowledge` and request fields: `sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category`.
    - `table` (required): The table containing the record.
    - `sysId` (required): The `sys_id` of the record.
    - `fields` (optional): Comma-separated list of fields to return.

List records
:   List records from a table with optional filtering.
    - `table` (required): The table to query. Common values: `incident`, `kb_knowledge`, `sc_req_item`, `change_request`, `problem`, `sc_task`, `cmdb_ci`. Custom tables are also supported.
    - `encodedQuery` (optional): ServiceNow encoded query for filtering (for example, `active=true^priority=1`).
    - `fields` (optional): Comma-separated list of fields to return.
    - `limit` (optional): Maximum number of results (default: 20).
    - `offset` (optional): Offset for pagination.
    - `orderBy` (optional): Field to order by (prefix with `-` for descending).

List knowledge bases
:   List available knowledge bases with their titles and descriptions. Use this to discover what knowledge bases exist before searching for articles.
    - `limit` (optional): Maximum number of results (default: 20).
    - `offset` (optional): Offset for pagination.

Get comments
:   Retrieve comments and work notes for a specific record. Use this action to understand the history and context of an incident, change request, or other record.
    - `tableName` (required): The table the record belongs to (for example, `incident`, `change_request`).
    - `recordSysId` (required): The `sys_id` of the record.
    - `limit` (optional): Maximum number of journal entries to return (default: 20).
    - `offset` (optional): Offset for pagination.

List tables
:   List available ServiceNow tables with their names and labels. Use this to discover what tables exist in the instance, especially for custom or unfamiliar ServiceNow configurations.
    - `query` (optional): Filter to search table names or labels (for example, `incident`, `CMDB`).
    - `limit` (optional): Maximum number of results (default: 50).
    - `offset` (optional): Offset for pagination.

Get attachment
:   Download a ServiceNow attachment as base64-encoded binary content by its attachment `sys_id`. Returns `fileName`, `contentType`, and `base64` fields. To process document content (PDFs, Word files, and so on), pass the base64 value through the Elasticsearch attachment processor. To find attachment `sys_id` values, query the `sys_attachment` table using List records with `encodedQuery=table_name=<table>^table_sys_id=<record_sys_id>`.
    - `sysId` (required): The `sys_id` of the attachment (from the `sys_attachment` table).

Create record
:   Insert a new record into any ServiceNow table. Returns the created record including its `sys_id` and record number. For ITSM incidents, use Create incident; for security incidents, use Create security incident; for ITOM events, use Create event. Use this action for all other tables.
    - `table` (required): The table to insert the record into.
    - `fields` (required): Key-value map of ServiceNow field names to values for the new record (for example, `{"short_description": "VPN issue", "impact": "2"}`). At least one field required; maximum 100 fields.

Update record
:   Update an existing record in any ServiceNow table by its `sys_id`. Provide only the fields that need to change — the connector leaves all other fields untouched. Returns the full updated record. For ITSM incidents, use Update incident.
    - `table` (required): The table containing the record.
    - `sysId` (required): The `sys_id` of the record to update.
    - `fields` (required): Key-value map of field names to their new values. At least one field required; maximum 100 fields.

Create incident
:   Create a new ITSM incident in ServiceNow. Returns the created incident including its `sys_id` and incident number (for example, `INC0012345`). Use Query users to resolve names to `sys_id` values for `caller_id` and `assigned_to`. Use Get choices to discover valid values for `category`, `impact`, and `urgency`.
    - `short_description` (required): Brief one-line summary of the incident.
    - `description` (optional): Detailed description.
    - `caller_id` (optional): `sys_id` or username of the reporting user.
    - `impact` (optional): Business impact — `1`=High, `2`=Medium, `3`=Low.
    - `urgency` (optional): Urgency level — `1`=High, `2`=Medium, `3`=Low.
    - `category` (optional): Incident category.
    - `subcategory` (optional): Incident subcategory.
    - `assignment_group` (optional): `sys_id` or name of the assignment group.
    - `assigned_to` (optional): `sys_id` or username of the assigned technician.
    - `comments` (optional): Initial customer-visible comment.
    - `work_notes` (optional): Initial internal work note (not visible to the caller).

Update incident
:   Update an existing ITSM incident by its `sys_id`. Provide only the fields to change. Returns the updated incident. To resolve or close an incident, use Close incident instead.
    - `sysId` (required): The `sys_id` of the incident to update.
    - `short_description` (optional): Updated brief summary.
    - `description` (optional): Updated detailed description.
    - `state` (optional): Incident state — `1`=New, `2`=In Progress, `3`=On Hold, `6`=Resolved, `7`=Closed.
    - `caller_id` (optional): `sys_id` or username of the caller.
    - `impact` (optional): Business impact — `1`=High, `2`=Medium, `3`=Low.
    - `urgency` (optional): Urgency level — `1`=High, `2`=Medium, `3`=Low.
    - `category` (optional): Incident category.
    - `subcategory` (optional): Incident subcategory.
    - `assignment_group` (optional): `sys_id` or name of the assignment group.
    - `assigned_to` (optional): `sys_id` or username of the assigned technician.
    - `comments` (optional): Customer-visible comment to append.
    - `work_notes` (optional): Internal work note to append (not visible to the caller).
    - `close_code` (optional): Resolution close code (use Get choices with `tableName=incident`, `fieldName=close_code`).
    - `close_notes` (optional): Detailed resolution notes (required when setting state to `6` or `7`).

Add comment
:   Add a customer-visible comment to a ServiceNow record. The comment appears in the record journal and is visible to the caller. Use Add work note for internal-only notes.
    - `table` (required): The table containing the record (for example, `incident`, `change_request`).
    - `sysId` (required): The `sys_id` of the record.
    - `comment` (required): The comment text to add.

Add work note
:   Add an internal work note to a ServiceNow record. Work notes are only visible to agents and never shown to the caller. Use Add comment for customer-facing journal entries.
    - `table` (required): The table containing the record (for example, `incident`, `change_request`).
    - `sysId` (required): The `sys_id` of the record.
    - `workNote` (required): The internal work note text to add.

Close incident
:   Resolve or close a ServiceNow incident by setting its state to Resolved (`6`) or Closed (`7`). A close code and close notes are required. Use Get choices with `tableName=incident`, `fieldName=close_code` to see valid close codes for the instance.
    - `sysId` (required): The `sys_id` of the incident to close.
    - `closeCode` (required): Resolution close code.
    - `closeNotes` (required): Detailed description of how the incident was resolved.
    - `state` (optional): Final state — `6`=Resolved, `7`=Closed (default: `6`).

Create security incident
:   Create a new Security Operations (SecOps/SIR) incident in the `sn_si_incident` table. Use this for cyber security incidents and threat investigations rather than ITSM incidents. Returns the created incident with its `sys_id`.
    - `short_description` (required): Brief summary of the security incident.
    - `description` (optional): Detailed description.
    - `priority` (optional): Priority — `1`=Critical, `2`=High, `3`=Moderate, `4`=Low, `5`=Planning.
    - `category` (optional): Security incident category (use Get choices with `tableName=sn_si_incident`, `fieldName=category`).
    - `subcategory` (optional): Security incident subcategory.
    - `assignment_group` (optional): `sys_id` or name of the assignment group.
    - `assigned_to` (optional): `sys_id` or username of the assigned analyst.
    - `affected_user` (optional): `sys_id` or username of the affected user.
    - `comments` (optional): Initial customer-visible comment.
    - `work_notes` (optional): Initial internal work note.
    - `business_criticality` (optional): Business criticality — `1`=Critical, `2`=High, `3`=Medium, `4`=Low, `5`=Negligible.

Create event
:   Send an ITOM event to ServiceNow Event Management. Creates or updates an alert in the Event Management console. Use `message_key` to deduplicate: events with the same `source`, `node`, `type`, and `message_key` update the existing alert instead of creating a new one.
    - `source` (required): Event source system (for example, `"Elastic"`, `"monitoring-agent"`).
    - `type` (required): Event type or category (for example, `"high_cpu"`, `"service_down"`).
    - `node` (optional): Hostname or IP address of the affected node.
    - `resource` (optional): Affected resource name (disk partition, service name, and so on).
    - `metric_name` (optional): Name of the metric that triggered the event.
    - `value` (optional): Current metric value at the time of the event (for example, `"95.2"`).
    - `severity` (optional): Severity — `0`=Clear, `1`=Critical, `2`=Major, `3`=Minor, `4`=Warning, `5`=Info.
    - `description` (optional): Detailed description of the event.
    - `message_key` (optional): Unique key for deduplication.
    - `additional_info` (optional): Extra key-value metadata to attach to the event (maximum 50 entries).

Upload attachment
:   Upload a file attachment to a ServiceNow record. The file must be provided as base64-encoded content. Returns the attachment metadata including the new attachment `sys_id`. Avoid files larger than 5 MB. To retrieve existing attachments use Get attachment.
    - `tableName` (required): The ServiceNow table to attach the file to (for example, `incident`, `change_request`).
    - `tableSysId` (required): The `sys_id` of the record to attach the file to.
    - `fileName` (required): Name of the file including extension (for example, `screenshot.png`, `report.pdf`).
    - `contentType` (required): MIME type of the file (for example, `application/pdf`, `image/png`, `text/plain`).
    - `base64Content` (required): Base64-encoded file content.

Delete record
:   Permanently delete a record from a ServiceNow table by its `sys_id`. This operation cannot be undone. Use only for automation-created records that need cleanup — prefer updating state to "Cancelled" or "Closed" over deleting business records.
    - `table` (required): The table containing the record to delete.
    - `sysId` (required): The `sys_id` of the record to permanently delete.

Get choices
:   Look up valid choice values for a ServiceNow field. Call this before writing to discover valid values for `state`, `close_code`, `category`, `impact`, `urgency`, and other choice-list fields. Returns values with their display labels.
    - `tableName` (required): The ServiceNow table to get choices for (for example, `incident`, `change_request`, `sn_si_incident`).
    - `fieldName` (required): The field name to get choices for (for example, `state`, `close_code`, `category`, `impact`, `urgency`, `priority`).
    - `language` (optional): Language code for choice labels (default: `en`).

Query users
:   Search ServiceNow users by name, email, or username. Use this to look up the `sys_id` for `caller_id` or `assigned_to` fields before creating or updating an incident.
    - `query` (optional): Search text to filter users by name, email, or username. Omit to list recent users.
    - `limit` (optional): Maximum number of users to return (default: 20).
    - `offset` (optional): Offset for pagination.

## Connector networking configuration [servicenow-search-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [servicenow-search-api-credentials]

### OAuth 2.0 Client Credentials

1. Select **System OAuth > Application Registry**.
2. Select **New**, then select **Create an OAuth API endpoint for external clients**.
3. Enter a name for your application.
4. Enter a **Client Secret** value, or let ServiceNow generate one.
5. Select **Submit**.
6. Copy the following values from the OAuth application:
   - **Client ID**: The auto-generated client ID.
   - **Client Secret**: The secret you configured.
7. Verify that the OAuth client is associated with a user account that has the roles required for the actions you plan to use:
   - **Read operations** (Search, Get record, List records): `itil` for incidents, `knowledge` for knowledge articles.
   - **Write operations** (Create/Update/Close incident, Add comment, Add work note): `itil` with write permissions.
   - **Security incidents** (Create security incident): `sn_si_incident_write`.
   - **Delete record**: admin or equivalent role on the target table.
   - **ITOM events** (Create event): `evt_mgmt_operator` or `evt_mgmt_admin`.
8. Enter the following values when you configure the connector in {{kib}}:
   - **Instance URL**: Your ServiceNow instance URL (for example, `https://your-instance.service-now.com`).
   - **Token URL**: `https://your-instance.service-now.com/oauth_token.do`.
   - **Client ID** and **Client Secret**: From step 6.

### OAuth 2.0 Authorization Code (recommended for per-user access) [servicenow-search-oauth-auth-code]

Use this method to let individual users sign in to ServiceNow through {{kib}}. {{kib}} stores refreshable tokens on the user's behalf.

1. Select **System OAuth** > **Application Registry**.
2. Select **New**, then select **Create an OAuth API endpoint for external clients**.
3. Configure the application as follows:
   - **Name**: Enter a name for the application (for example, "Elastic Kibana").
   - **Redirect URL**: Enter {{kib}}'s connector OAuth callback URL. Copy the following pattern and replace your public {{kib}} hostname:

     ```text
     https://<your-kibana-host>/api/actions/connector/_oauth_callback
     ```

   - **Client Secret**: Enter a value, or let ServiceNow generate one.
4. Select **Submit**.
5. Copy the **Client ID** and **Client Secret** from the application.
6. In {{kib}}, create a ServiceNow connector and select **OAuth 2.0 Authorization Code** as the authentication method. Enter the **Client ID** and **Client Secret**, then authorize with your ServiceNow account.

::::{tip}
The connector automatically configures the correct ServiceNow OAuth endpoints for your instance. You do not need to enter the authorization or token URLs manually.
::::
