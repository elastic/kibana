---
navigation_title: "ServiceNow"
type: reference
description: "Use the ServiceNow connector to search, read, and write records, incidents, security incidents, events, and attachments in ServiceNow, and to start workflows from incident, journal, and change-approval events."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# ServiceNow connector [servicenow-search-action-type]

The {{sn}} connector enables federated search and data retrieval from {{sn}} tables using the ServiceNow Table API.

You can use this connector in **Agent Builder** and **Workflows**. With **Receive events** turned on, {{sn}} can also start a workflow when an incident, journal entry, or change approval changes.

::::{note}
For the ServiceNow ITSM, SecOps, and ITOM connectors used with alerting and cases, refer to [ServiceNow ITSM](/reference/connectors-kibana/servicenow-action-type.md), [ServiceNow SecOps](/reference/connectors-kibana/servicenow-sir-action-type.md), and [ServiceNow ITOM](/reference/connectors-kibana/servicenow-itom-action-type.md).
::::

## Create connectors in {{kib}} [define-servicenow-search-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [servicenow-search-connector-configuration]

{{sn}} connectors support **OAuth 2.0 Client Credentials** and **OAuth 2.0 Authorization Code** authentication. Select the authentication type when you create or edit the connector.

Instance URL
:   The URL of your {{sn}} instance (for example, `https://your-instance.service-now.com`).

#### OAuth 2.0 Client Credentials

Token URL
:   The OAuth 2.0 token endpoint URL for your {{sn}} instance (for example, `https://your-instance.service-now.com/oauth_token.do`).

Client ID
:   The OAuth client ID from your {{sn}} application registry.

Client Secret
:   The OAuth client secret for your {{sn}} application.

#### OAuth 2.0 Authorization Code

Client ID
:   The OAuth client ID from your {{sn}} application registry. Refer to [OAuth Authorization Code setup](#servicenow-search-oauth-auth-code).

Client Secret
:   The OAuth client secret for your {{sn}} application.

The connector automatically uses the correct {{sn}} OAuth endpoints for your instance (`https://<your-instance>.service-now.com/oauth_auth.do` for authorization and `https://<your-instance>.service-now.com/oauth_token.do` for token exchange). The connector handles scopes automatically.

## Receive ServiceNow events [servicenow-search-inbound-events]
```{applies_to}
serverless: unavailable
stack: preview 9.6+
```

The connector can start a workflow from an incident, a journal entry, or a change-approval update. {{kib}} does not create the {{sn}} rules. An administrator configures one outbound REST message and three async business rules that POST the JSON envelope below.

A saved connector does not receive events until **Receive events** is turned on and the connector is saved. Rotate the ingest token after that save, and copy the ingest URL from the connector. The connector requires an Enterprise license.

### Prerequisites [servicenow-search-inbound-prerequisites]

{{kib}}
:   Enterprise license, `server.publicBaseUrl`, and `xpack.actions.inboundEvents.enabled: true`. On the connector, turn on **Receive events**, save, and rotate the ingest token.

{{sn}} platform
:   The rules use an async business rule and an outbound REST message (`RESTMessageV2`). Flow Designer and IntegrationHub are not required.

Incident and journal events
:   Incident Management, which provides the `incident` table. Journal rows are stored in the platform table `sys_journal_field`.

Change-approval events
:   Change Management, which provides `change_request`. Approval rows are stored in the platform table `sysapproval_approver`. An instance without Change Management can still use the incident and journal triggers.

Roles
:   Creating the business rules and the REST message requires the admin role. The user who changes the record must be able to read that row. Work notes require a role that can read them, such as `itil`. If that user cannot read the work note, {{sn}} sends no text and {{kib}} does not start a work-note workflow.

### Ingest URL [servicenow-search-inbound-url]

Copy the URL from the connector. It has this shape. The default space has no `/s/{space-id}` prefix.

```text
https://<kibana-host>/api/actions/events/.servicenow_search/<connector-id>
https://<kibana-host>/s/<space-id>/api/actions/events/.servicenow_search/<connector-id>
```

Send `Authorization: Bearer <ingest-token>` and `Content-Type: application/json`. If the REST message cannot set `Authorization`, add `?token=<ingest-token>` to the URL instead.

### Payload [servicenow-search-inbound-payload]

Each POST sends one `occurrence`. Reference fields are sys_ids (`getValue()`), not display values. `sys_updated_on` is used only to correlate retries. It is not a workflow field. A body that omits it still starts the workflow, with a new correlation key.

| Workflow event | `occurrence` | Required fields | Optional fields |
| --- | --- | --- | --- |
| `servicenow_search.incident_created` | `incident.created` | `table`, `sys_id`, `number` | `summary`, `state`, `priority`, `assignment_group`, `assigned_to` |
| `servicenow_search.incident_updated` | `incident.updated` | `table`, `sys_id` | `number`, `changed_fields` |
| `servicenow_search.incident_resolved` | `incident.resolved` | `table`, `sys_id`, `state` | `number`, `close_code`, `close_notes` |
| `servicenow_search.comment_added` | `comment.added` | `table`, `sys_id`, `journal_entry_id`, `author`, `text` | `number`, `timestamp` |
| `servicenow_search.work_note_added` | `work_note.added` | `table`, `sys_id`, `journal_entry_id`, `author`, `text` | `number`, `timestamp` |
| `servicenow_search.change_approval_state_changed` | `change.approval_state_changed` | `change_request_id`, `approval_id`, `state` | `approver`, `previous_state` |

`summary` is the incident short description. `changed_fields` is an array of up to 20 objects, `{ "field", "previous", "current" }`. `previous` and `current` are included when {{sn}} sent them. Identifiers are limited to 128 characters, field values and `summary` to 1,024, and `text` and `close_notes` to 40,000.

`incident.resolved` covers both resolved and closed. The resulting `state` is on the event, so a workflow condition can keep one of the two. A comment, a work note, and an approval are separate occurrences. A workflow subscribed to one of them does not run for the others.

An `occurrence` that is not in this table, or a body missing a required field, does not start these workflows.

### Outbound REST message [servicenow-search-inbound-rest-message]

In {{sn}}, open **System Web Services > Outbound > REST Message** and create a message named `Elastic Workflows`. Add an HTTP method named `post`:

- HTTP method: POST
- Endpoint: the ingest URL copied from the connector
- HTTP header `Content-Type`: `application/json`
- HTTP header `Authorization`: `Bearer <ingest-token>`

The three business rules call this method. Rotating the ingest token means updating this header, or the `token` query parameter, and saving the connector token in {{kib}}.

### Incident rule [servicenow-search-inbound-incident-rule]

Create an **async** business rule on `incident` with **Insert** and **Update** selected. On insert, the script sends `incident.created`. When `state` changes to the resolved or closed value, it sends `incident.resolved` and does not also send `incident.updated`. Out-of-box values are `6` (Resolved) and `7` (Closed). If this instance uses different choices, change those two values in the script. Any other watched-field change sends `incident.updated` with `changed_fields`. A journal-only update changes none of those fields, so the script does not call {{kib}}. Comments and work notes are delivered by the journal rule.

```javascript
(function executeRule(current, previous) {
  var isInsert = current.operation() == 'insert';
  var state = current.getValue('state');
  var stateChanged = !isInsert && current.state.changes();
  var isResolvedOrClosed = stateChanged && (state == '6' || state == '7');
  var occurrence;

  if (isInsert) {
    occurrence = 'incident.created';
  } else if (isResolvedOrClosed) {
    occurrence = 'incident.resolved';
  } else {
    occurrence = 'incident.updated';
  }

  var watched = [
    'short_description', 'state', 'priority', 'assignment_group', 'assigned_to',
    'urgency', 'impact', 'category', 'caller_id', 'cmdb_ci', 'close_code', 'close_notes'
  ];
  var changedFields = [];

  if (occurrence == 'incident.updated') {
    for (var i = 0; i < watched.length; i++) {
      var fieldName = watched[i];
      if (current[fieldName].changes()) {
        changedFields.push({
          field: fieldName,
          previous: previous.getValue(fieldName),
          current: current.getValue(fieldName)
        });
      }
    }
    if (changedFields.length === 0) {
      return;
    }
  }

  var body = {
    occurrence: occurrence,
    table: current.getTableName(),
    sys_id: current.getUniqueValue(),
    number: current.getValue('number'),
    sys_updated_on: current.getValue('sys_updated_on')
  };

  if (occurrence == 'incident.created') {
    body.summary = current.getValue('short_description');
    body.state = state;
    body.priority = current.getValue('priority');
    body.assignment_group = current.getValue('assignment_group');
    body.assigned_to = current.getValue('assigned_to');
  } else if (occurrence == 'incident.updated') {
    body.changed_fields = changedFields.slice(0, 20);
  } else {
    body.state = state;
    body.close_code = current.getValue('close_code');
    body.close_notes = current.getValue('close_notes');
  }

  var request = new sn_ws.RESTMessageV2('Elastic Workflows', 'post');
  request.setRequestBody(JSON.stringify(body));
  request.executeAsync();
})(current, previous);
```

### Journal rule [servicenow-search-inbound-journal-rule]

Create an **async** business rule on `sys_journal_field` with **Insert** selected. Set the condition to `name=incident` and `element` in `comments`, `work_notes`. `comments` sends `comment.added`. `work_notes` sends `work_note.added`. `table` and `sys_id` identify the parent incident (`name` and `element_id`). `author` is `sys_created_by` on the journal row.

```javascript
(function executeRule(current, previous) {
  var element = current.getValue('element');
  var occurrence;

  if (element == 'comments') {
    occurrence = 'comment.added';
  } else if (element == 'work_notes') {
    occurrence = 'work_note.added';
  } else {
    return;
  }

  var text = current.getValue('value');
  var author = current.getValue('sys_created_by');
  if (!text || !author) {
    return;
  }

  var body = {
    occurrence: occurrence,
    table: current.getValue('name'),
    sys_id: current.getValue('element_id'),
    journal_entry_id: current.getUniqueValue(),
    author: author,
    text: text,
    timestamp: current.getValue('sys_created_on')
  };
  var parent = new GlideRecord(body.table);
  if (parent.get(body.sys_id)) {
    body.number = parent.getValue('number');
  }

  var request = new sn_ws.RESTMessageV2('Elastic Workflows', 'post');
  request.setRequestBody(JSON.stringify(body));
  request.executeAsync();
})(current, previous);
```

### Change-approval rule [servicenow-search-inbound-approval-rule]

Create an **async** business rule on `sysapproval_approver` with **Update** selected and a condition that **State** changes. The script sends `change.approval_state_changed` only when `sysapproval` is the sys_id of a `change_request`. Approvals for other tables are ignored. `approver` is the approver's sys_id. `state` is the current approval choice, such as `approved` or `rejected`.

```javascript
(function executeRule(current, previous) {
  if (!current.state.changes()) {
    return;
  }

  var changeRequestId = current.getValue('sysapproval');
  var changeRequest = new GlideRecord('change_request');
  if (!changeRequest.get(changeRequestId)) {
    return;
  }

  var body = {
    occurrence: 'change.approval_state_changed',
    change_request_id: changeRequestId,
    approval_id: current.getUniqueValue(),
    state: current.getValue('state'),
    approver: current.getValue('approver'),
    previous_state: previous.getValue('state')
  };

  var request = new sn_ws.RESTMessageV2('Elastic Workflows', 'post');
  request.setRequestBody(JSON.stringify(body));
  request.executeAsync();
})(current, previous);
```

Outbound HTTP requests are recorded in `sys_outbound_http_log`.

### Example [servicenow-search-inbound-example]

POST this body to the ingest URL. It starts `servicenow_search.incident_created` with `number` `INC0010001`, `summary` `VPN is down`, and `priority` `1`.

```bash
curl -X POST \
  'https://<kibana-host>/api/actions/events/.servicenow_search/<connector-id>' \
  -H 'Authorization: Bearer <ingest-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "occurrence": "incident.created",
    "table": "incident",
    "sys_id": "46b66a40a9fe198101d44d884e7d3a1a",
    "number": "INC0010001",
    "summary": "VPN is down",
    "state": "1",
    "priority": "1",
    "assignment_group": "group-1",
    "assigned_to": "user-1",
    "sys_updated_on": "2026-01-01 12:00:00"
  }'
```

This workflow runs for that event when the priority is `1`. It stays disabled until the sample execution shows the expected fields. For another space, use the ingest URL copied from that space's connector. Replace `<connector-id>` with the connector instance id.

```yaml
name: Notify on a new priority 1 incident
enabled: true
triggers:
  - type: servicenow_search.incident_created
    connector-id: <connector-id>
    on:
      condition: "event.priority:1"
steps:
  - name: log_incident
    type: console
    with:
      message: "Incident {{ event.number }} was created: {{ event.summary }}"
```

## Test connectors [servicenow-search-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.
The test verifies connectivity by querying the `sys_user` table, which any authenticated user can access.

The {{sn}} connector has the following actions:

Search
:   Search for records in a {{sn}} table using full-text search.
    - `table` (required): The table to search. Common values: `incident`, `kb_knowledge`, `sc_req_item`, `change_request`, `problem`, `sc_task`, `cmdb_ci`. Custom tables are also supported.
    - `query` (required): The full-text search query string.
    - `encodedQuery` (optional): {{sn}} encoded query to combine with the full-text search for additional filtering (for example, `active=true^priority=1`). Uses `^` to AND conditions and `^OR` for OR.
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
    - `encodedQuery` (optional): {{sn}} encoded query for filtering (for example, `active=true^priority=1`).
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
:   List available {{sn}} tables with their names and labels. Use this to discover what tables exist in the instance, especially for custom or unfamiliar {{sn}} configurations.
    - `query` (optional): Filter to search table names or labels (for example, `incident`, `CMDB`).
    - `limit` (optional): Maximum number of results (default: 50).
    - `offset` (optional): Offset for pagination.

Get attachment
:   Download a {{sn}} attachment as base64-encoded binary content by its attachment `sys_id`. Returns `fileName`, `contentType`, and `base64` fields. To process document content (PDFs, Word files, and so on), pass the base64 value through the Elasticsearch attachment processor. To find attachment `sys_id` values, query the `sys_attachment` table using List records with `encodedQuery=table_name=<table>^table_sys_id=<record_sys_id>`.
    - `sysId` (required): The `sys_id` of the attachment (from the `sys_attachment` table).

Create record {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Insert a new record into any {{sn}} table. Returns the created record including its `sys_id` and record number. For ITSM incidents, use Create incident; for security incidents, use Create security incident; for ITOM events, use Create event. Use this action for all other tables.
    - `table` (required): The table to insert the record into.
    - `fields` (required): Key-value map of {{sn}} field names to values for the new record (for example, `{"short_description": "VPN issue", "impact": "2"}`). At least one field required; maximum 100 fields.

Update record {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Update an existing record in any {{sn}} table by its `sys_id`. Provide only the fields that need to change — the connector leaves all other fields untouched. Returns the full updated record. For ITSM incidents, use Update incident.
    - `table` (required): The table containing the record.
    - `sysId` (required): The `sys_id` of the record to update.
    - `fields` (required): Key-value map of field names to their new values. At least one field required; maximum 100 fields.

Create incident {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new ITSM incident in {{sn}}. Returns the created incident including its `sys_id` and incident number (for example, `INC0012345`). Use Query users to resolve names to `sys_id` values for `caller_id` and `assigned_to`. Use Get choices to discover valid values for `category`, `impact`, and `urgency`.
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

Update incident {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
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

Add comment {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Add a customer-visible comment to a {{sn}} record. The comment appears in the record journal and is visible to the caller. Use Add work note for internal-only notes.
    - `table` (required): The table containing the record (for example, `incident`, `change_request`).
    - `sysId` (required): The `sys_id` of the record.
    - `comment` (required): The comment text to add.

Add work note {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Add an internal work note to a {{sn}} record. Work notes are only visible to agents and never shown to the caller. Use Add comment for customer-facing journal entries.
    - `table` (required): The table containing the record (for example, `incident`, `change_request`).
    - `sysId` (required): The `sys_id` of the record.
    - `workNote` (required): The internal work note text to add.

Close incident {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Resolve or close a {{sn}} incident by setting its state to Resolved (`6`) or Closed (`7`). A close code and close notes are required. Use Get choices with `tableName=incident`, `fieldName=close_code` to see valid close codes for the instance.
    - `sysId` (required): The `sys_id` of the incident to close.
    - `closeCode` (required): Resolution close code.
    - `closeNotes` (required): Detailed description of how the incident was resolved.
    - `state` (optional): Final state — `6`=Resolved, `7`=Closed (default: `6`).

Create security incident {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new Security Operations (SecOps/SIR) incident in the `sn_si_incident` table. Use this for cyber security incidents and threat investigations rather than ITSM incidents. Returns the created incident with its `sys_id`.

    ::::{note}
    Requires the **ServiceNow Security Incident Response (SIR)** plugin to be installed on the {{sn}} instance. The connector user must have the `sn_si_incident_write` role. If the plugin is absent, the connector returns a 400 error stating that the table does not exist.
    ::::

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

Create event {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Send an ITOM event to {{sn}} Event Management via `/api/global/em/jsonv2`. Creates or updates an alert in the Event Management console. Use `message_key` to deduplicate: events with the same `source`, `node`, `type`, and `message_key` update the existing alert instead of creating a new one.

    ::::{note}
    Requires the **ServiceNow Event Management (ITOM)** plugin to be installed on the {{sn}} instance. The connector user must have the `evt_mgmt_integration` role (or `evt_mgmt_operator`/`evt_mgmt_admin`). If the plugin is absent or the role is missing, the connector returns a 400 error.
    ::::

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

Upload attachment {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Upload a file attachment to a {{sn}} record. The file must be provided as base64-encoded content. Returns the attachment metadata including the new attachment `sys_id`. Avoid files larger than 5 MB. To retrieve existing attachments use Get attachment.
    - `tableName` (required): The {{sn}} table to attach the file to (for example, `incident`, `change_request`).
    - `tableSysId` (required): The `sys_id` of the record to attach the file to.
    - `fileName` (required): Name of the file including extension (for example, `screenshot.png`, `report.pdf`).
    - `contentType` (required): MIME type of the file (for example, `application/pdf`, `image/png`, `text/plain`).
    - `base64Content` (required): Base64-encoded file content.

Delete record {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Permanently delete a record from a {{sn}} table by its `sys_id`. This operation cannot be undone. Use only for automation-created records that need cleanup — prefer updating state to "Cancelled" or "Closed" over deleting business records.
    - `table` (required): The table containing the record to delete.
    - `sysId` (required): The `sys_id` of the record to permanently delete.

Get choices {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Look up valid choice values for a {{sn}} field. Call this before writing to discover valid values for `state`, `close_code`, `category`, `impact`, `urgency`, and other choice-list fields. Returns values with their display labels.
    - `tableName` (required): The {{sn}} table to get choices for (for example, `incident`, `change_request`, `sn_si_incident`).
    - `fieldName` (required): The field name to get choices for (for example, `state`, `close_code`, `category`, `impact`, `urgency`, `priority`).
    - `language` (optional): Language code for choice labels (default: `en`).

Query users {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Search {{sn}} users by name, email, or username. Use this to look up the `sys_id` for `caller_id` or `assigned_to` fields before creating or updating an incident.
    - `query` (optional): Search text to filter users by name, email, or username. Omit to list recent users.
    - `limit` (optional): Maximum number of users to return (default: 20).
    - `offset` (optional): Offset for pagination.

Who am I {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Return the identity of the currently authenticated {{sn}} user. Returns `sys_id`, `user_name`, `name`, `email`, `title`, `department`, and `active` status. Use this to verify connector credentials, find the `sys_id` of the connector account for use as `caller_id`, or confirm which account is performing write operations. Takes no parameters.

## Connector networking configuration [servicenow-search-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [servicenow-search-api-credentials]

### OAuth 2.0 Client Credentials

1. Select **System OAuth > Application Registry**.
2. Select **New**, then select **Create an OAuth API endpoint for external clients**.
3. Enter a name for your application.
4. Enter a **Client Secret** value, or let {{sn}} generate one.
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
   - **Instance URL**: Your {{sn}} instance URL (for example, `https://your-instance.service-now.com`).
   - **Token URL**: `https://your-instance.service-now.com/oauth_token.do`.
   - **Client ID** and **Client Secret**: From step 6.

### OAuth 2.0 Authorization Code (recommended for per-user access) [servicenow-search-oauth-auth-code]

Use this method to let individual users sign in to {{sn}} through {{kib}}. {{kib}} stores refreshable tokens on the user's behalf.

1. Select **System OAuth** > **Application Registry**.
2. Select **New**, then select **Create an OAuth API endpoint for external clients**.
3. Configure the application as follows:
   - **Name**: Enter a name for the application (for example, "Elastic Kibana").
   - **Redirect URL**: Enter {{kib}}'s connector OAuth callback URL. Copy the following pattern and replace your public {{kib}} hostname:

     ```text
     https://<your-kibana-host>/api/actions/connector/_oauth_callback
     ```

   - **Client Secret**: Enter a value, or let {{sn}} generate one.
4. Select **Submit**.
5. Copy the **Client ID** and **Client Secret** from the application.
6. In {{kib}}, create a {{sn}} connector and select **OAuth 2.0 Authorization Code** as the authentication method. Enter the **Client ID** and **Client Secret**, then authorize with your {{sn}} account.

::::{tip}
The connector automatically configures the correct {{sn}} OAuth endpoints for your instance. You do not need to enter the authorization or token URLs manually.
::::
