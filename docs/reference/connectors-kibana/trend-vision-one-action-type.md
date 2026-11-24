---
navigation_title: "TrendAI Vision One"
type: reference
description: "Read Workbench alerts, Observed Attack Techniques detections, endpoints, response tasks, and sandbox analysis results in TrendAI Vision One."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# TrendAI Vision One connector [trend-vision-one-action-type]

The TrendAI Vision One connector connects to the TrendAI Vision One public API (v3.0) of your tenant's region. Use it to list Workbench alerts, read Observed Attack Techniques detections, find endpoints, follow response tasks, and read the result of a sandbox analysis.

::::{note}
This connector is currently available in **Agent Builder** only. Agents can only read: every action that changes data in TrendAI Vision One is marked _(not yet available)_ and is not exposed to agents. You can call those actions only through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Create connectors in {{kib}} [define-trend-vision-one-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [trend-vision-one-connector-configuration]

TrendAI Vision One connectors have the following configuration properties:

Region API URL
:   The API address of your tenant's region, from the following table. The default is India. Use the API address (`api...`), not the console address (`portal...`): the connector refuses a `portal.` address and names the matching API address. The URL must use `https` and contain only the region host: no path, query string, or fragment. The connector accepts `http` only for `localhost`, `127.0.0.1`, and `[::1]`, which is meant for testing against a mock server. The host must be in the {{kib}} allowed hosts list (`xpack.actions.allowedHosts`).

| Region | API address |
| --- | --- |
| United States | `https://api.xdr.trendmicro.com` |
| Germany | `https://api.eu.xdr.trendmicro.com` |
| Singapore | `https://api.sg.xdr.trendmicro.com` |
| Japan | `https://api.xdr.trendmicro.co.jp` |
| Australia | `https://api.au.xdr.trendmicro.com` |
| India | `https://api.in.xdr.trendmicro.com` (default) |
| United Arab Emirates | `https://api.mea.xdr.trendmicro.com` |
| United Kingdom | `https://api.uk.xdr.trendmicro.com` |
| Canada | `https://api.ca.xdr.trendmicro.com` |
| South Africa | `https://api.za.xdr.trendmicro.com` |
| Indonesia | `https://api.id.xdr.trendmicro.com` |

API key
:   A TrendAI Vision One API key. The connector sends it as `Authorization: Bearer <API key>`. Refer to [Get API credentials](#trend-vision-one-api-credentials).

## Test connectors [trend-vision-one-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test runs the TrendAI Vision One connectivity check, which confirms the region API URL and the API key. It needs no role permission. An invalid or expired key, or a key from another region, fails the test.

## Connector actions [trend-vision-one-connector-actions]

The TrendAI Vision One connector exposes the following actions:

`listAlerts`
:   Lists Workbench alerts in a time window (`startDateTime`, `endDateTime`, `dateTimeTarget`), newest first, optionally filtered by `status`, `investigationResult`, and `severity`, and sorted with `orderBy` (default `createdDateTime desc`). `dateTimeTarget` is `createdDateTime` (default), `updatedDateTime`, or `firstInvestigatedDateTime`. Reads pages of 10 and returns at most `maxResults` alerts (10 to 200 in steps of 10, default 50) in `items`, with `totalCount`, `pagesRead`, `nextLink`, and `nextLinkRepeats`. When the last page read holds more alerts than `maxResults` allows, `nextLink` reads that page again, and `nextLinkRepeats` is the number of alerts at its start that this call already returned, so no alert is skipped.

`getAlertDetails`
:   Returns one Workbench alert by ID, with its status, investigation result, severity, score, impact scope, indicators, matched rules, and the alert's current `etag`.

`updateAlertStatus` _(not yet available)_
:   Sets the `status` (Open, In Progress, Closed) and the `investigationResult` of a Workbench alert; give at least one. When you pass the `etag` from `getAlertDetails`, the update fails if the alert changed since that read; a blank `etag` is rejected. Without `etag`, the connector reads the alert first, returns `outcome: skipped` when the alert already has the requested values, and otherwise updates it with the current ETag. If TrendAI Vision One returns no ETag, the action fails without changing the alert: the connector never sends an update without `If-Match`.

`addAlertNote` _(not yet available)_
:   Adds a note (`content`, up to 500,000 characters) to a Workbench alert and returns the new `noteId`. A note cannot be deleted.

`listObservedAttackTechniques`
:   Lists Observed Attack Techniques detections by detection time (`detectedStartDateTime` and `detectedEndDateTime`) or ingestion time (`ingestedStartDateTime` and `ingestedEndDateTime`), with an optional filter. Give both the start and the end of a time range, or neither; without a time range, TrendAI Vision One returns only the detections of the last hour, so give a detection range to read more. A range that gives only ingestion times is cut to the detected window, so also give a detection range when you need older detections. Returns one page (`top` 50 (default) or 100) and `nextLink`. Data older than 365 days is not available.

`listEndpoints`
:   Lists managed endpoints with their agent GUID, name, operating system, IP addresses, isolation status, and agent and sensor state. Narrow the list with `agentGuid`, `endpointName`, or a `filter`. Returns one page (`top` 10, 50, 100 (default), or 200) and `nextLink`. Use `select` (up to 10 fields) to return only the fields you need and `orderBy` to sort by `agentGuid` (default) or by the last connection or scan time.

`isolateEndpoint` _(not yet available)_
:   Isolates an endpoint from the network; it can still reach the TrendAI Vision One management server. Give exactly one of `agentGuid` or `endpointName`, and an optional `description` shown in the task list.

`restoreEndpointConnection` _(not yet available)_
:   Restores the network connection of an isolated endpoint. Give exactly one of `agentGuid` or `endpointName`.

`terminateProcess` _(not yet available)_
:   Terminates a running process on a Windows endpoint by `processId` and its `fileName` (full path of the executable) or `fileSha1`; give at least one of the two, or the action fails before anything is sent. This cannot be undone.

`collectForensicFile` _(not yet available)_
:   Collects a file from an endpoint (`filePath`) into a password-protected archive in TrendAI Vision One.

`getResponseTaskStatus`
:   Returns a response task by the `taskId` that a response action returned: its status (`queued`, `running`, `pendingApproval`, `succeeded`, `failed`, `canceled`, or `rejected`), action, target, and error.

`quarantineEmailMessage` _(not yet available)_
:   Moves an email message to the quarantine folder of its mailbox. Give `messageId` (optionally with `mailBox`) or `uniqueId`.

`deleteEmailMessage` _(not yet available)_
:   Deletes an email message. A deleted message cannot be recovered. Give `messageId` (optionally with `mailBox`) or `uniqueId`.

`disableUserAccount` _(not yet available)_
:   Disables a user account in Active Directory or Microsoft Entra ID.

`enableUserAccount` _(not yet available)_
:   Enables a disabled user account in Active Directory or Microsoft Entra ID.

`forceUserSignOut` _(not yet available)_
:   Signs a user out of all active Microsoft Entra ID sessions.

`addToSuspiciousObjectList` _(not yet available)_
:   Adds a URL, domain, IP address, file SHA-1, file SHA-256, or sender email address to the suspicious object list, with an optional scan action (`block` or `log`), risk level, and expiry (`daysToExpiration`, -1 for never, up to 365). Adding an object that is already on the list updates its entry. Each type holds at most 10,000 objects; when a list is full, TrendAI Vision One deletes the objects that expire first.

`removeFromSuspiciousObjectList` _(not yet available)_
:   Removes an object from the suspicious object list. Returns `outcome: notFound` when the object is not on the list.

`addToExceptionList` _(not yet available)_
:   Adds an object to the suspicious object exception list so that it is never flagged. This weakens detection for that object.

`submitFileToSandbox` _(not yet available)_
:   Submits one file, base64-encoded in `file` with its `fileName`, to the sandbox. `file` must be standard base64 with its `=` padding (a length that is a multiple of 4). Optional `documentPassword`, `archivePassword`, and `arguments` are given as plain text. Returns the submission `id`, the file `digest`, and the submission `quota`. Using Sandbox Analysis requires TrendAI Flex in your TrendAI Vision One tenant; ask your TrendAI Vision One administrator if submissions are refused.

`submitUrlsToSandbox` _(not yet available)_
:   Submits 1 to 10 URLs to the sandbox. Returns one item per URL with its status and submission ID, and the submission `quota`. A submission costs sandbox credits and cannot be deleted. Using Sandbox Analysis requires TrendAI Flex in your TrendAI Vision One tenant; ask your TrendAI Vision One administrator if submissions are refused.

`getSandboxAnalysisResult`
:   Returns the sandbox verdict for a submission ID: risk level, detection names, threat types, and true file type. The action fails with a not found error while the analysis is still running or when the submission ID is unknown.

### Behavior of the actions [trend-vision-one-action-behavior]

* **Response tasks.** Response actions send one target per call, start a task in TrendAI Vision One, and return at once with `outcome`, `status`, `taskId`, and `error`. `outcome` is `requested` when the task started and `skipped` when the same task is already in progress, with the `taskId` of that task when TrendAI Vision One returns it, so repeating a call does not start a second task. When TrendAI Vision One does not find the target, and for any other per-item error, the action fails with the product's code and message. `restoreEndpointConnection` by `endpointName` gets a per-item 500 both for a name TrendAI Vision One does not know and for a server error, so its error names both causes: check the name or use `agentGuid`, and retry if the name is right. Follow the task with `getResponseTaskStatus`.
* **List changes.** `addToSuspiciousObjectList`, `removeFromSuspiciousObjectList`, and `addToExceptionList` send one object per call and return `outcome`, `status`, and `error`. `removeFromSuspiciousObjectList` returns `outcome: notFound` when the object is not on the list, so repeating a removal succeeds. Other errors fail the action with the product's code and message.
* **Alert updates.** `updateAlertStatus` returns `outcome: skipped` without a change when the alert already has the requested values, and fails with a not found error for an unknown alert.
* **Collected files.** `getResponseTaskStatus` returns the hashes, size, and expiry of a collected file and `archiveReady`. The download link of the archive and its password are not returned, so they are not kept in the saved tool output; download the archive from the TrendAI Vision One console.
* **Pagination.** List actions return `nextLink` when more data exists. Pass it back as `nextLink` with the same filters to read the next page. The connector follows a `nextLink` only on the configured region host and on the same API path. When TrendAI Vision One answers with a `nextLink` that was already read, `listAlerts` stops and returns `nextLink: null`.
* **Filters.** Filter values such as `endpointName` and the free-form `filter` are trimmed. A blank value is ignored like a missing one; spaces inside a value are kept. `agentGuid` is trimmed and must be a UUID, so a blank `agentGuid` is rejected; leave it out instead.
* **Deprecated fields.** The connector never sends the deprecated `investigationStatus` alert field and removes it from returned alerts. Use `status` and `investigationResult`.
* **Errors.** An error from TrendAI Vision One keeps its HTTP status and response headers, such as `Retry-After` on a 429, so that the caller can decide when to retry. The connector does not follow redirects: an HTTP 3xx answer fails the action with its status, and nothing is sent to the redirect location.
* **Limits and retries.** Every request times out after 60 seconds, and responses follow the {{kib}} Actions response size limit (`xpack.actions.maxResponseContentLength`). Read actions retry on HTTP 429, 500, 502, 503, and 504; state-changing actions retry only on HTTP 429. A 429 inside a 207 per-item answer fails the item without a retry. Each request makes at most three attempts and honors `Retry-After` up to 30 seconds: a longer `Retry-After` is not retried early, and the action fails with the rate limit message. One action run has a time budget of 100 seconds, below the {{kib}} limit for an action: each request gets the time left as its timeout, no request starts and no retry waits once the budget would be passed, and `listAlerts` stops reading pages when less than 10 seconds are left and returns the alerts read with the `nextLink` of the next page. A sandbox submission is not retried when the daily quota is used up.

## Required permissions [trend-vision-one-permissions]

Each action needs the permissions in the following table on the role of the API key. The table is taken from the TrendAI Vision One v3.0 API reference. Response actions need the **View, filter, and search (Task List tab)** permission in addition to their own permission, so that the task they start can be read with `getResponseTaskStatus`, which also needs **Download task result**.

| Action | Permissions |
| --- | --- |
| `listAlerts` | Workbench: View, filter, and search |
| `getAlertDetails` | Workbench: View, filter, and search |
| `updateAlertStatus` | Workbench: Modify alert details and assign owners; Workbench: View, filter, and search (the connector reads the alert first for the ETag) |
| `addAlertNote` | Workbench: Modify alert details and assign owners |
| `listObservedAttackTechniques` | Observed Attack Techniques: View, filter, and search |
| `listEndpoints` | Endpoint Inventory: View |
| `isolateEndpoint` | Response Management: Isolate endpoint; Response Management: View, filter, and search (Task List tab) |
| `restoreEndpointConnection` | Response Management: Isolate endpoint; Response Management: View, filter, and search (Task List tab) |
| `terminateProcess` | Response Management: Terminate process; Response Management: View, filter, and search (Task List tab) |
| `collectForensicFile` | Response Management: Collect remote file; Response Management: View, filter, and search (Task List tab) |
| `getResponseTaskStatus` | Response Management: Download task result; Response Management: View, filter, and search (Task List tab) |
| `quarantineEmailMessage` | Response Management: Quarantine/Restore messages; Response Management: View, filter, and search (Task List tab) |
| `deleteEmailMessage` | Response Management: Delete messages; Response Management: View, filter, and search (Task List tab) |
| `disableUserAccount` | Response Management: Enable/Disable user account, force sign out, force password reset; Response Management: View, filter, and search (Task List tab) |
| `enableUserAccount` | Response Management: Enable/Disable user account, force sign out, force password reset; Response Management: View, filter, and search (Task List tab) |
| `forceUserSignOut` | Response Management: Enable/Disable user account, force sign out, force password reset; Response Management: View, filter, and search (Task List tab) |
| `addToSuspiciousObjectList` | Suspicious Object Management: Manage lists and configure settings; Suspicious Object Management: View, filter, and search |
| `removeFromSuspiciousObjectList` | Suspicious Object Management: Manage lists and configure settings; Suspicious Object Management: View, filter, and search |
| `addToExceptionList` | Suspicious Object Management: Manage lists and configure settings; Suspicious Object Management: View, filter, and search |
| `submitFileToSandbox` | Sandbox Analysis: Submit object; Sandbox Analysis: View, filter, and search |
| `submitUrlsToSandbox` | Sandbox Analysis: Submit object; Sandbox Analysis: View, filter, and search |
| `getSandboxAnalysisResult` | Sandbox Analysis: Submit object; Sandbox Analysis: View, filter, and search |

## Notes from live use [trend-vision-one-live-notes]

* The Endpoint Sensor must be enabled on an endpoint for the isolate, restore, terminate, and collect response actions. A task queued for an endpoint whose sensor is disabled ends as `failed` and the endpoint is not isolated.
* Response tasks usually finish within seconds to minutes. A task queued for an agent that is not ready can fail after about 55 minutes. Poll `getResponseTaskStatus` with a bounded number of attempts and handle `running`, `failed`, and `succeeded`.
* Confirm an isolation by reading `isolationStatus` with `listEndpoints`, not only the task result. The endpoint inventory can lag the task result by several minutes.
* A sandbox analysis needs a supported file type (for example a PDF; plain text files are rejected) and, for a URL, a host that TrendAI Vision One can reach. A failed analysis shows on the sandbox task, not when you submit. The submission ID is the analysis ID.
* Email response actions need the quarantine location of your mail provider configured in Email and Collaboration Protection; otherwise TrendAI Vision One answers with a configuration error.
* Without a time range, `listObservedAttackTechniques` returns only the last hour (the product default). Give a detection range to read more.

## Connector networking configuration [trend-vision-one-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [trend-vision-one-api-credentials]

1. Sign in to the TrendAI Vision One console.
2. Go to **Administration > User Roles** and create or pick a role that grants the permissions of the actions you plan to use. [Required permissions](#trend-vision-one-permissions) lists the permissions of each action.
3. Go to **Administration > API Keys** and add an API key with that role and an expiry date.
4. Copy the API key. In the **API key** field of the connector, paste the key. In **Region API URL**, enter the API address of your tenant's region from the table in [Connector configuration](#trend-vision-one-connector-configuration).
