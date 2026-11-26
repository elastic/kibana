---
navigation_title: "Cortex XDR"
type: reference
description: "Use the Cortex XDR connector to find endpoints, read cases, issues, audit logs, and XQL results, and scan, tag, or collect files from endpoints."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Cortex XDR connector [cortex-xdr-action-type]

The Cortex XDR connector uses the [Cortex XDR public API](https://cortex-docs.paloaltonetworks.com/xdr-api/readme.md) so agents can investigate and respond in Cortex XDR. Agents can find endpoints and read cases, issues, audit logs, and Cortex Query Language (XQL) query results. They can also scan and tag endpoints, collect and restore files, update cases and issues, and add indicators and blocklist entries. The connector uses the cases and issues APIs from the Cortex XDR 6.0 API reference, so use a tenant on version 6.0 or later.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Create connectors in {{kib}} [define-cortex-xdr-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [cortex-xdr-connector-configuration]

Cortex XDR connectors have the following configuration properties:

API URL
:   The API URL of your Cortex XDR tenant, which you get when you click **Copy API URL** on the **API Keys** page, for example `https://api-mytenant.xdr.us.paloaltonetworks.com`. Each tenant has its own host in its region. Don't add `/public_api/v1`. The URL must use HTTPS; HTTP is accepted only for `localhost`.

API key ID
:   The **ID** of the API key, from the **ID** column on the **API Keys** page.

API key
:   An API key with security level **Advanced**. Cortex XDR rejects a **Standard** key. The connector never sends the key: it signs every request with the key, a one-time random value, and the current time. Because the signature includes the time, the {{kib}} host clock must be correct.

API key role
:   The role of the API key must allow the actions you use: Endpoint Administration (View; Edit for tags), Action Center (View), the Isolation, Scan, Quarantine, and File Retrieval response actions, Script Library (View; Run Standard Scripts or Run High-Risk Scripts), Cases and Issues (View; Edit; Change Case/Issue Severity), Hash Exceptions (Edit), Rules (Edit) for indicators, Auditing (View), and Identity Analytics (View). XQL queries need the Instance Administrator role. Refer to [Required permissions](#cortex-xdr-required-permissions).

## Test connectors [cortex-xdr-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test reads one case, which checks the API URL, the key signature, and the View permission on Cases and Issues.

## Connector actions [cortex-xdr-connector-actions]

Response actions (isolate, unisolate, scan, cancel scan, quarantine, restore, run script, and retrieve file) are asynchronous. Cortex XDR returns an action ID as soon as it accepts the request. Use `getActionStatus` with that ID to follow the action on each endpoint.

List actions return up to `maxResults` rows (default 100, at most 500), read in pages of 100. When `nextSearchFrom` in the result isn't empty, call the action again with `searchFrom` set to that value to read more. Times are epoch milliseconds.

### Endpoints [cortex-xdr-endpoint-actions]

`getEndpoints`
:   Find endpoints by endpoint ID, hostname, IP address, platform, isolation state, connection status, or malware scan status. The action combines filters with AND. Without a filter, it lists every endpoint. Returns each endpoint's ID, name, IP addresses, status, isolation state, scan status, and tags. Parameters: `endpointIds`, `hostnames`, `ipList` (up to 100 each), `platform`, `isolate`, `endpointStatus`, `scanStatus`, `sortField`, `sortOrder`, `searchFrom`, `maxResults`.

`isolateEndpoint` _(not yet available)_
:   Network-isolate 1 to 1,000 endpoints. The action first reads the endpoints: endpoints that are already isolated or pending isolation are returned in `skipped`, unknown IDs in `notFound`, and only the rest are sent. Parameters: `endpointIds` (required), `caseId` (adds the action to that case's timeline).

`unisolateEndpoint` _(not yet available)_
:   Release the network isolation of 1 to 1,000 endpoints, with the same check as `isolateEndpoint`. Parameters: `endpointIds` (required), `caseId`.

`getActionStatus`
:   Get the state of a response action on each endpoint, such as `PENDING`, `IN_PROGRESS`, `COMPLETED_SUCCESSFULLY`, `FAILED`, or `TIMEOUT`. Parameters: `actionId` (required).

`scanEndpoint`
:   Start a malware scan on 1 to 1,000 endpoints. The connector doesn't support scanning all endpoints in one request. The result's `endpoints_count` is the number of endpoints the scan reached; Cortex XDR doesn't list unknown IDs. Parameters: `endpointIds` (required), `caseId`.

`cancelScan`
:   Cancel a pending or running malware scan on 1 to 1,000 endpoints. Like `scanEndpoint`, it returns `endpoints_count` and doesn't list unknown IDs. Parameters: `endpointIds` (required), `caseId`.

`getPolicy`
:   Get the name of the prevention policy applied to one endpoint. Parameters: `endpointId` (required).

`addEndpointTag`
:   Add one tag to 1 to 1,000 endpoints. Cortex XDR confirms the request as a whole and doesn't report unknown endpoint IDs, so check the tags with `getEndpoints`. Parameters: `endpointIds` and `tag` (both required).

`removeEndpointTag`
:   Remove one tag from 1 to 1,000 endpoints. As with `addEndpointTag`, unknown endpoint IDs aren't reported. Parameters: `endpointIds` and `tag` (both required).

`getDeviceControlViolations`
:   List device control violations, such as blocked USB drives. Parameters: `endpointIds`, `hostnames`, `types`, `timestampFrom`, `timestampTo`, `searchFrom`, `maxResults`.

### Files [cortex-xdr-file-actions]

`quarantineFile` _(not yet available)_
:   Quarantine a file on 1 to 1,000 endpoints. Confirm the result with `getQuarantineStatus`: the request succeeds even when the file isn't on an endpoint, and `endpoints_count` doesn't list unknown endpoint IDs. Parameters: `endpointIds`, `filePath`, and `fileHash` (SHA256; all required).

`restoreFile`
:   Restore a quarantined file. Without `endpointId`, the file is restored on every endpoint that holds it in quarantine. Parameters: `fileHash` (required), `endpointId`, `caseId`.

`getQuarantineStatus`
:   Check whether files are quarantined. Specify either one file (`endpointId`, `fileHash`, and optionally `filePath`) or up to 100 files in `files`.

`blocklistFiles`
:   Add 1 to 1,000 SHA256 hashes to the blocklist of the whole tenant. To remove entries, use the Cortex XDR console. Parameters: `hashList` (required), `comment`, `caseId`.

`allowlistFiles` _(not yet available)_
:   Add 1 to 1,000 SHA256 hashes to the allowlist of the whole tenant. To remove entries, use the Cortex XDR console. Parameters: `hashList` (required), `comment`, `caseId`.

`retrieveFile`
:   Collect files from 1 to 10 endpoints, with up to 20 paths in total split by operating system. The collected files stay in the tenant until its retention period ends. Parameters: `endpointIds` (required), `windowsPaths`, `linuxPaths`, `macosPaths` (at least one), `caseId`.

`getRetrievedFileDetails`
:   Get the result of a `retrieveFile` request: the download route of each endpoint's ZIP archive. With `download` set to `true`, the action also returns archives up to `maxDownloadSizeBytes` (at most 768,000 bytes) as Base64. Larger archives return their route only. `ready` is `true` once every endpoint has a download route. Parameters: `actionId` (required), `download`, `maxDownloadSizeBytes`.

### Scripts [cortex-xdr-script-actions]

`getScripts`
:   List the scripts in the script library, with each script's `script_uid`, platforms, and high-risk flag. Parameters: `names`, `windowsSupported`, `linuxSupported`, `macosSupported`, `isHighRisk`.

`runScript` _(not yet available)_
:   Run a library script on 1 to 1,000 endpoints. This runs code on the endpoints, and you can't undo it through the API. The result's `endpoints_count` doesn't list unknown endpoint IDs. Parameters: `scriptUid` and `endpointIds` (required), `parameters`, `timeout` (seconds, default 600, at most 3,600), `caseId`.

`getScriptResults`
:   Get the output of a `runScript` action on each endpoint. Parameters: `actionId` (required).

### Cases and issues [cortex-xdr-case-actions]

`getCases`
:   Search cases by case ID, status, severity, creation time, or modification time. Parameters: `caseId`, `status`, `severity`, `createdAfter`, `createdBefore`, `modifiedAfter`, `modifiedBefore`, `sortField`, `sortOrder`, `searchFrom`, `maxResults`.

`getCaseDetails`
:   Get one case with its file and network artifacts and its issues (up to 100). If the connector can't read the artifacts or issues, it returns the rest with an `errors` list. Parameters: `caseId` (required).

`getIssues`
:   Search issues by ID, detection method, severity, status, or creation time. Parameters: `ids`, `severity`, `detectionMethod`, `status`, `insertedAfter`, `insertedBefore`, `includeEvidences`, `sortField`, `sortOrder`, `searchFrom`, `maxResults`.

`updateCase`
:   Update one case: status, manual severity (an empty value clears it), assignee, and notes. Resolving a case needs `resolveReason`. Parameters: `caseId` (required) and at least one of `status`, `resolveReason`, `resolveComment`, `userSeverity`, `assignedUser`, `notes`.

`updateIssue`
:   Update the status or severity of 1 to 50 issues. Cortex XDR updates one issue per request, so the result lists the outcome for each issue: an unknown issue ID has `notFound` set to `true`, and the action fails when it updated no issue. Resolving an issue needs `resolutionReason`. Parameters: `issueIds` (required) and at least one of `status` or `severity`; optionally `resolutionReason` and `resolutionComment`.

### XQL, indicators, audit logs, and users [cortex-xdr-investigation-actions]

`runXqlQuery`
:   Start an XQL query and return its query ID. Each query uses the tenant XQL quota. Parameters: `query` (required) and either `relativeTime` or both `fromTime` and `toTime`.

`getXqlResults`
:   Get the status and results of an XQL query, up to 1,000 rows. By default, the call returns immediately with status `PENDING` while the query runs. Parameters: `queryId` (required), `limit`, `pendingFlag`, `format`.

`insertIndicators`
:   Insert or update 1 to 1,000 indicators of compromise (IOCs). Giving an existing `ruleId` overwrites that indicator. To remove indicators, use the Cortex XDR console. Parameters: `indicators` (required), each with `indicator` and `type` and optionally `severity`, `ruleId`, `expirationDate`, `defaultExpirationEnabled`, `comment`, `reputation`, and `reliability`.

`getIndicators`
:   List IOCs by value, type, or severity. Parameters: `indicator`, `type`, `severity`, `extendedView`, `searchFrom`, `maxResults`.

`getAuditLogs`
:   Read the management audit log (what users and API keys did) or the agent audit log (reports from endpoint agents). Parameters: `logType` (required: `management` or `agent`), `timestampFrom`, `timestampTo`, `types`, `subTypes`, `results`, `emails` (management log only), `endpointIds` (agent log only), `searchFrom`, `maxResults`.

`getRiskyUsers`
:   List the users Cortex XDR rates as most risky, highest score first. Needs the Identity Threat Module license. No parameters.

## Required permissions [cortex-xdr-required-permissions]

Cortex XDR controls API access with the role assigned to the API key. Its API reference doesn't name a permission for each API, so the table lists the role permissions that govern each feature in the Cortex XDR console. Confirm them in your tenant's role settings.

| Role permission | Actions |
| --- | --- |
| Endpoint Administration: View | `getEndpoints`, `getPolicy`, `getQuarantineStatus`, `getDeviceControlViolations` |
| Endpoint Administration: Edit | `addEndpointTag`, `removeEndpointTag` |
| Action Center: View | `getActionStatus` |
| Isolation response action | `isolateEndpoint`, `unisolateEndpoint` |
| Scan response action | `scanEndpoint`, `cancelScan` |
| Quarantine response action | `quarantineFile`, `restoreFile` |
| File Retrieval response action | `retrieveFile`, `getRetrievedFileDetails` |
| Script Library: View | `getScripts`, `getScriptResults` |
| Script Library: Run Standard Scripts or Run High-Risk Scripts | `runScript` |
| Cases and Issues: View | `getCases`, `getCaseDetails`, `getIssues` |
| Cases and Issues: Edit | `updateCase`, `updateIssue` |
| Cases and Issues: Change Case/Issue Severity | `updateCase` with `userSeverity`, `updateIssue` with `severity` |
| Hash Exceptions: Edit | `blocklistFiles`, `allowlistFiles` |
| Rules: Edit | `insertIndicators`, `getIndicators` |
| Auditing: View | `getAuditLogs` |
| Identity Analytics: View | `getRiskyUsers` |
| Instance Administrator role | `runXqlQuery`, `getXqlResults` |

Cortex XDR returns HTTP 403 when the role lacks a permission and HTTP 402 when the tenant lacks the license an API needs.

## Limits [cortex-xdr-limits]

* Cortex XDR allows 10 API requests per second per tenant, shared by all API keys. The connector tries a rate-limited request up to three times with a growing delay, then reports the limit.
* Requests time out after 60 seconds.
* {{kib}} ends a single connector run after about 120 seconds, so the connector gives all requests of one run a shared budget of 100 seconds, including retries. A list action that runs out of time returns the rows it read with `timedOut` set to `true` and a `nextSearchFrom` to continue from. `updateIssue` lists the issues it didn't send in `notAttempted`, `getRetrievedFileDetails` skips the remaining downloads, and `isolateEndpoint` or `unisolateEndpoint` send nothing when their endpoint lookup didn't finish. Keep `pendingFlag` at its default (`true`) and call `getXqlResults` again until the query finishes.
* The connector doesn't return more than 1,000 XQL rows. Narrow the query or add a `limit`.

## Connector networking configuration [cortex-xdr-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [cortex-xdr-api-credentials]

To create an API key for the connector:

1. In Cortex XDR, go to **Settings** → **Configurations** → **Integrations** → **API Keys**.
2. Click **New Key**.
3. Set **Security Level** to **Advanced**.
4. Assign a role that allows the actions you plan to use: Endpoint Administration (View; Edit for tags), Action Center (View), the Isolation, Scan, Quarantine, and File Retrieval response actions, Script Library (View; Run Standard Scripts or Run High-Risk Scripts), Cases and Issues (View; Edit; Change Case/Issue Severity), Hash Exceptions (Edit), Rules (Edit), Auditing (View), and Identity Analytics (View). For XQL queries, assign the Instance Administrator role.
5. Optionally, set an expiration date, then click **Generate**.
6. Copy the API key. Cortex XDR shows it only once.
7. In the **API Keys** table, note the key's **ID**.
8. Click **Copy API URL** to copy your tenant's API URL.
9. In {{kib}}, create the connector with the API URL, the API key ID, and the API key.
