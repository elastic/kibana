---
navigation_title: "SentinelOne (v2)"
type: reference
description: "Find endpoints, isolate hosts, triage and mitigate threats, run scripts, and manage blocklists, exclusions, indicators, and detection rules in SentinelOne."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# SentinelOne (v2) connector [sentinelone-v2-action-type]

The SentinelOne (v2) connector connects to the SentinelOne management API (v2.1). Use it to find endpoints, isolate and release hosts, and triage, annotate, and mitigate threats. It also runs remote scripts and returns their results, and retrieves files from endpoints and threats.

You can also manage blocklist entries, exclusions, threat intelligence indicators, firewall rules, and custom detection Storyline Active Response (STAR) rules.

You can use this connector in **Agent Builder** and **Workflows**.

::::{note}
Actions marked _(not yet available)_ are not exposed to Agent Builder agents. You can run them from workflows and through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

The [SentinelOne connector](/reference/connectors-kibana/sentinelone-action-type.md) keeps working unchanged. For new use cases, use SentinelOne (v2); [Differences from the SentinelOne connector](#sentinelone-v2-differences) lists what changed.

## Create connectors in {{kib}} [define-sentinelone-v2-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sentinelone-v2-connector-configuration]

SentinelOne (v2) connectors have the following configuration properties:

SentinelOne tenant URL
:   Your SentinelOne management console URL with `https`, for example `https://yourcompany.sentinelone.net`. The connector adds the API path. The host must be in the {{kib}} allowed hosts list (`xpack.actions.allowedHosts`).

API token
:   The API token of a SentinelOne console user or service user. Paste the token only: the connector sends it as `Authorization: ApiToken <token>`. Refer to [Get API credentials](#sentinelone-v2-api-credentials).

## Test connectors [sentinelone-v2-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test lists one agent (`GET /web/api/v2.1/agents?limit=1`), which confirms the tenant URL, the API token, and the Endpoints: view permission. The connector page offers only this connectivity test. Run the actions from workflows, rules, Agent Builder, or the connector execute API.

## Connector actions [sentinelone-v2-connector-actions]

The SentinelOne (v2) connector exposes the following actions:

`getAgents`
:   Finds endpoints by host name, agent universally unique identifier (UUID), IP address, or ID and returns their network status and last-seen time. Requires the Endpoints: view permission.

`isolateHost`
:   Disconnects endpoints from the network; they can still reach the SentinelOne management console. The result lists the agent IDs sent to SentinelOne (`requested`), the IDs already isolated (`skipped`), and the IDs SentinelOne did not find (`notFound`); when no ID is left to send, the action succeeds without a request and `data.affected` is 0. Requires the Endpoints: disconnect from network permission.

`releaseHost`
:   Reconnects isolated endpoints to the network. The result lists the agent IDs sent to SentinelOne (`requested`), the IDs already connected (`skipped`), and the IDs SentinelOne did not find (`notFound`); when no ID is left to send, the action succeeds without a request and `data.affected` is 0. Requires the Endpoints: reconnect to network permission.

`executeScript` _(not yet available)_
:   Runs a script from the SentinelOne Script Library on selected endpoints and returns the task ID to follow. Each script type needs its own RemoteOps permission: run data collection script, run artifact collection script, or run action script. SentinelOne answers `Insufficient permissions` (HTTP 403) when the role lacks the permission for the type of script, for example action scripts such as Download File.

`getRemoteScriptStatus`
:   Returns the status of each endpoint task started by a remote script run. Requires the Task Management: view permission.

`getRemoteScriptResults`
:   Returns download links for the output of finished remote script tasks. Requires the RemoteOps: view output permission.

`downloadRemoteScriptResults`
:   Downloads the results file of one remote script task, as SentinelOne provides it, for case evidence. Requires the RemoteOps: view output permission.

`getRemoteScripts`
:   Lists the scripts in the SentinelOne Script Library so you can select one by name or ID.

`fetchAgentFiles`
:   Asks an endpoint to upload up to 10 files (up to 10 MB per request) as an encrypted archive for investigation. The archive password (`zipPassCode`) is saved with the workflow step or agent tool call that runs the action. Requires the Endpoints: file fetch permission.

`downloadAgentFile`
:   Downloads a file archive that an endpoint uploaded after a fetch request. Requires the Endpoints: view permission.

`getActivities`
:   Returns the SentinelOne activity log for endpoints, threats or a scope, for example to confirm an action took effect. Requires the Activity: view permission.

`mitigateThreat`
:   Applies a mitigation to specific threats. Set `action` to `kill`, `quarantine`, `remediate`, `rollback-remediation`, `un-quarantine`, `remove_macros`, or `restore_macros`. Rollback applies only on Windows and remediate only on macOS and Windows. `data.affected` only acknowledges the request; `data.details` lists the mitigation reports per threat. Requires the Endpoint Threats permission for the mitigation you set: kill, quarantine, unquarantine, remediate, rollback, remove macro, or restore macro. The SentinelOne API reference names the Admin, IR Team, and SOC roles.

`rollbackThreat`
:   Rolls back the changes a threat made, for example files a ransomware encrypted (Windows endpoints). Requires the Endpoint Threats: rollback permission. SentinelOne can accept the request and skip actions it can't perform, so read the threat back with `getThreatDetails` to confirm.

`getThreats`
:   Searches SentinelOne threats by verdict, status, confidence, file hash, endpoint, scope and time range. Requires the Endpoint Threats: view permission.

`updateThreatVerdict`
:   Records the analyst verdict (true positive, false positive, suspicious, or undefined) on threats. Requires the Endpoint Threats: update analyst verdict permission.

`updateThreatStatus`
:   Sets the incident status (unresolved, in progress, or resolved) of threats, optionally with a verdict. Requires the Endpoint Threats: update incident status permission.

`addThreatNote`
:   Adds a note to threats, for example to record what an automated response or an analyst did. Requires the Endpoint Threats: view permission.

`getThreatNotes`
:   Returns the analyst notes recorded on a threat. Requires the Endpoint Threats: view permission.

`addHashToBlocklist`
:   Blocks a file hash on the endpoints of a selected account, site, group, or the whole tenant. Requires the Blocklist: create permission.

`removeHashFromBlocklist` _(not yet available)_
:   Removes blocklist entries, for example after a false positive. Requires the Blocklist: delete permission.

`searchBlocklist`
:   Finds existing blocklist entries for a hash or within a scope. Requires the Blocklist: view permission.

`searchAlerts`
:   Searches SentinelOne alerts (custom detection alerts) by severity, status, verdict, scope and time range. Requires the STAR Rule Alerts: view permission.

`updateAlertVerdict`
:   Records the analyst verdict on SentinelOne alerts. Requires the STAR Rule Alerts: update analyst verdict permission.

`updateAlertStatus`
:   Sets the incident status of SentinelOne alerts. Requires the STAR Rule Alerts: update incident status permission.

`getSites`
:   Lists sites and their IDs, to select the scope for blocklist entries, exclusions and rules. Requires the Sites: view permission.

`getGroups`
:   Lists endpoint groups and their IDs, for scoping and for moving endpoints between groups. Requires the Groups: view permission.

`getAccounts`
:   Lists accounts and their IDs, for account-level scope. Requires the Accounts: view permission and an account-level or global user. SentinelOne refuses site-level users.

`createExclusion` _(not yet available)_
:   Creates an exclusion (hash, path, certificate, browser or file type) at a selected scope, for example after a false positive. Requires the Exclusions: create permission.

`listExclusions`
:   Lists exclusions by type, OS, value or scope. Requires the Exclusions: view permission.

`deleteExclusion` _(not yet available)_
:   Removes exclusions so detection applies to the item again. Requires the Exclusions: delete permission.

`moveAgent` _(not yet available)_
:   Moves endpoints to another group, for example one with a stricter policy. SentinelOne answers with the number of agents it moved (`data.agentsMoved`). The action reads the agents first and the result lists the agent IDs sent to SentinelOne (`requested`), the IDs already in the group (`skipped`), and the IDs SentinelOne did not find (`notFound`); when no ID is left to send, the action succeeds without a move request and `data.agentsMoved` is 0. When SentinelOne moves none of the requested agents, the action fails. Requires the Groups: move to group and Endpoints: view permissions.

`fetchThreatFile`
:   Asks SentinelOne to upload the file of one threat to the management console, encrypted with a password you enter (at least 10 characters; SentinelOne rejects shorter ones). The password is saved with the workflow step or agent tool call that runs the action. SentinelOne accepts one threat per request. The response only acknowledges the request, so wait for the upload and then use `downloadThreatFile`. Requires the Endpoint Threats: fetch threat file permission (the SentinelOne API reference names the Admin, IR Team, and SOC roles).

`downloadThreatFile`
:   Downloads a threat's file sample from the SentinelOne cloud, as SentinelOne provides it, for evidence or sandbox analysis. SentinelOne has the file in the cloud only after it was uploaded: when it returns no link, run `fetchThreatFile` first. Requires the Endpoint Threats: view permission.

`initiateScan`
:   Starts an on-demand full disk scan on endpoints. Requires the Endpoints: initiate scan permission.

`abortScan`
:   Stops a running full disk scan on endpoints. Requires the Endpoints: abort scan permission.

`shutdownAgent` _(not yet available)_
:   Shuts endpoints down as a last-resort containment step; there is no way to power them on again through the API. Requires the Endpoints: shut down permission.

`broadcastMessage`
:   Shows a message (up to 140 characters) to the user of Windows and macOS endpoints. Requires the Endpoints: send message permission. SentinelOne reports 0 affected objects for Linux endpoints, so the action fails for them.

`createIOC`
:   Adds an indicator (domain, IP address, hash or URL) to SentinelOne threat intelligence at a selected scope. Requires the Threat Intelligence: manage permission.

`searchIOCs`
:   Looks up threat intelligence indicators by value, type, source or scope. Requires the Threat Intelligence: view permission.

`deleteIOC` _(not yet available)_
:   Removes threat intelligence indicators by their IDs within an account. Requires the Threat Intelligence: manage permission.

`getInstalledApplications`
:   Lists the applications installed on endpoints (name, version, publisher, install date). Requires the Endpoints: view permission. SentinelOne ignores `limit` for this action, so the list can be longer than `limit`.

`getThreatDetails`
:   Returns the full record of specific threats: file, verdicts, statuses, endpoint and indicators. Requires the Endpoint Threats: view permission.

`getThreatTimeline`
:   Returns the event timeline of a threat for investigation and case evidence. Requires the Endpoint Threats: view permission.

`listFirewallRules`
:   Lists Firewall Control rules by name, action, status, OS or scope. At least one of these filters is required.

`createFirewallRule`
:   Creates a Firewall Control rule at a selected scope, for example to block a malicious destination.

`deleteFirewallRule` _(not yet available)_
:   Deletes Firewall Control rules by ID.

`createStarRule`
:   Creates a STAR custom detection rule at a selected scope. Requires the STAR Custom Rules: manage permission.

`updateStarRule`
:   Edits a Storyline Active Response (STAR) custom detection rule (name, query, severity, status and other settings). Requires the STAR Custom Rules: manage permission.

`enableStarRules`
:   Turns on STAR custom detection rules. Requires the STAR Custom Rules: manage permission.

`disableStarRules` _(not yet available)_
:   Turns off STAR custom detection rules. Requires the STAR Custom Rules: manage permission.

`deleteStarRule` _(not yet available)_
:   Deletes STAR custom detection rules. Requires the STAR Custom Rules: manage permission.

`runScriptAndWait` _(not yet available)_
:   Runs a Script Library script on selected endpoints, waits for it to finish (up to 240 seconds) and returns the result links in one step. SentinelOne can queue a script on an endpoint for much longer than that. When the wait ends first, the action returns `timedOut: true` and the `parentTaskId`. For scripts that might queue, use `executeScript`, then poll `getRemoteScriptStatus` in a workflow loop with a wait step, then call `getRemoteScriptResults`. The wait runs inside workflows. {{kib}} closes a request to the connector execute API after 120 seconds, so when you call the action through the API, keep `waitSeconds` at 100 or less (the default is 100).

`getApplicationCves`
:   Lists the known Common Vulnerabilities and Exposures (CVEs) of one application from Application Risk, by application ID or by application name, vendor, and version, with severity, CVE ID, and publish date filters. Enter the vendor exactly as SentinelOne stores it, which is HTML-escaped (for example `Ubuntu Developers &lt;a@b&gt;`). Requires Application Risk on the account and the Applications Page: view risks permission. Ranger Insights adds queries by several application IDs, or by name and vendor without a version.

`runQuery`
:   Runs a Singularity Data Lake Power Query (PQ), waits for the result (`waitSeconds`, 10 to 100 seconds, default 60), and returns the result table with up to 1,000 rows. The connector always deletes the query afterward. When the wait ends first, the action returns `status: timedOut`; narrow the time range or the filter and run it again. Requires the Skylight Query API: view permission.

### Behavior of the actions [sentinelone-v2-action-behavior]

* **Explicit targets.** Actions that change state require explicit IDs (agent, threat, alert, rule, blocklist entry, exclusion, indicator, or firewall rule IDs) or an explicit scope (`accountIds`, `siteIds`, `groupIds`, or `tenant`). An empty list is rejected before any request, because SentinelOne applies an empty filter to every matching object. `isolateHost`, `releaseHost`, `getInstalledApplications`, and `getThreatDetails` take at most 300 IDs per call, because the IDs are sent in the URL.
* **Acknowledgments.** Isolate, release, scan, mitigate, and script actions return SentinelOne's acknowledgment (`data.affected`), not completion. Read the state back with `getAgents`, `getThreatDetails`, or `getRemoteScriptStatus`. When SentinelOne reports per-item errors or `data.affected` is 0, the action fails with the IDs and SentinelOne's detail. `isolateHost`, `releaseHost`, and `moveAgent` read the agents first and skip the ones already in the target state, so repeating them succeeds; they list the IDs in `requested`, `skipped`, and `notFound`. `addHashToBlocklist`, `createExclusion` and `createIOC` fail the same way when SentinelOne reports per-item errors.
* **Pagination.** List actions return one page (`limit` 1 to 1,000, default 10) with `pagination.nextCursor` and `pagination.totalItems`. Pass `nextCursor` back as `cursor` with the same filters to get the next page; it is `null` on the last page. Paging is cursor-based only: the `skip`, `countOnly` and `skipCount` parameters of the SentinelOne API are not exposed, and most list actions offer the sort and filter inputs listed for them rather than every API parameter. `getApplicationCves` also accepts `skip`, `countOnly`, and `skipCount`, and its `pagination.totalItems` is accurate only on the first page.
* **Newest first.** `getActivities` returns the oldest entries first by default. To read the latest entries, for example to confirm that an isolate or scan took effect, set `additionalFilters` to `{"sortBy": "createdAt", "sortOrder": "desc"}`.
* **Alert verdicts.** SentinelOne might not accept `undefined` as the verdict of an alert that already has another verdict. The action then fails because no object was affected. `updateThreatVerdict` accepts `undefined`.
* **Downloads.** `downloadAgentFile`, `downloadRemoteScriptResults` and `downloadThreatFile` return the file as SentinelOne provides it, base64-encoded in `content`, with `fileName`, `contentType` and `sizeBytes`. The signed link that SentinelOne uses for the transfer is not returned, so it is not kept in workflow history. `getRemoteScriptResults` returns result links that are signed and expire after about an hour: use them promptly. Archives are not unpacked or decrypted. Files larger than 25 MB fail with an error; download them from the SentinelOne console. The API token is sent to a download link only when the link is on the configured console host, and never on a redirect to another host.
* **Limits and retries.** Every request times out after 60 seconds. Downloads are limited to 25 MB; other responses follow the {{kib}} Actions response size limit (`xpack.actions.maxResponseContentLength`, 1 MB by default). Read actions retry on HTTP 429, 502, 503, and 504; state-changing actions retry only on HTTP 429. Each action makes at most three attempts, honors `Retry-After` up to 30 seconds, and then reports the error.
* **Registration tokens and other credentials.** `getSites` and `getGroups` never return site or group registration tokens, because a token lets anyone enroll new agents into your tenant. Read them in the SentinelOne console. `getAgents` returns `licenseKey` as `[redacted]`.
* **Singularity Data Lake queries.** `runQuery` calls the Singularity Data Lake query service (`/sdl/v2/api/queries`) on the console host with the same API token, sent as `Authorization: Bearer <token>`, and its queries use the Power Query (PQ) language, so legacy Deep Visibility (S1QL) queries must be rewritten.
* **Deprecated routes.** SentinelOne's deprecated routes are not built as actions: the legacy Deep Visibility query routes, the installed-applications CVE route, and the hash verdict route. `getApplicationCves` covers CVEs and `runQuery` covers queries.

## Workflow examples [sentinelone-v2-workflow-examples]

The following steps run in a workflow that starts from an alert. Replace `<connector-id>` with the ID of your SentinelOne (v2) connector.

Isolate the endpoint of an alert and read its network status back. SentinelOne confirms the request first and isolates the endpoint afterward, so wait and read the status again before you rely on it. The sample leaves out two steps that a production workflow should have: a condition that checks exactly one agent matched (`steps.find_agent.output.pagination.totalItems`), and an analyst approval before the isolation.

```yaml
steps:
  - name: find_agent
    type: sentinelone2.getAgents
    connector-id: <connector-id>
    with:
      computerName: "{{ event.alerts[0].host.name }}"
      limit: 2

  - name: isolate
    type: sentinelone2.isolateHost
    connector-id: <connector-id>
    with:
      agentIds:
        - "{{ steps.find_agent.output.data[0].id }}"

  - name: pause
    type: wait
    with:
      duration: 30s

  - name: read_status
    type: sentinelone2.getAgents
    connector-id: <connector-id>
    with:
      ids:
        - "{{ steps.find_agent.output.data[0].id }}"
```

Find the malicious, unresolved threats of that endpoint and record on each one what the workflow did. The `${{ }}` form keeps the list of threat IDs as a list:

```yaml
steps:
  - name: find_threats
    type: sentinelone2.getThreats
    connector-id: <connector-id>
    with:
      agentIds:
        - "{{ steps.find_agent.output.data[0].id }}"
      confidenceLevels:
        - malicious
      incidentStatuses:
        - unresolved
      limit: 100

  - name: add_threat_note
    type: sentinelone2.addThreatNote
    connector-id: <connector-id>
    with:
      threatIds: "${{ steps.find_threats.output.data | map: 'id' }}"
      text: "Reviewed by the workflow '{{ workflow.name }}'."
```

## Differences from the SentinelOne connector [sentinelone-v2-differences]

SentinelOne (v2) keeps the 11 action names of the SentinelOne connector (`executeScript`, `getAgents`, `isolateHost`, `releaseHost`, `getRemoteScripts`, `getRemoteScriptStatus`, `getRemoteScriptResults`, `downloadRemoteScriptResults`, `fetchAgentFiles`, `downloadAgentFile`, and `getActivities`) and adds 41 actions, plus `getApplicationCves` and `runQuery`. These inputs and outputs changed:

| Action | SentinelOne connector | SentinelOne (v2) |
|---|---|---|
| `isolateHost`, `releaseHost` | Agent filters such as `computerName`; acted on the first match | Explicit `agentIds`; returns `data.affected`, `skipped`, `notFound` and `requested` |
| `executeScript` | `filter` (`ids` or `uuids`) and a nested `script` object | Top-level `agentIds` or `agentUuids` and script fields; `scriptName` and `alertIds` are not sent |
| `getRemoteScriptStatus` | Sent `parent_task_id` | Sends `parentTaskId` |
| `getAgents`, `getActivities`, `getRemoteScripts` | Passed every filter through, no page size limit | Named filters plus `additionalFilters` (documented filter names only); `limit` 1 to 1,000; date and text operators are named `createdAtGte`, `createdAtLte`, `valueContains`, and `computerNameContains` |
| `downloadAgentFile`, `downloadRemoteScriptResults` | Returned a file stream | Returns `content` (base64), `fileName`, `contentType` and `sizeBytes`, up to 25 MB |
| List actions | Raw response | Same response envelope; `pagination.nextCursor` is always present |
| Authentication | Token sent as a query parameter | Token sent in the `Authorization: ApiToken` header |

## Connector networking configuration [sentinelone-v2-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [sentinelone-v2-api-credentials]

1. Sign in to the SentinelOne management console.
2. Go to **Settings > Users > Service Users** and create a service user, or open **My User** for your own user. Menu names can differ by console version.
3. Select the scope and role of the user. The token has the role and scope of its user. Pick an account, site, or group scope that covers the endpoints you want to act on, and a role that grants the permissions of the actions you plan to use. Each action in [Connector actions](#sentinelone-v2-connector-actions) lists its permission, for example Endpoints: view, Endpoints: disconnect from network, Endpoint Threats: view, Endpoint Threats: update analyst verdict, and RemoteOps: view output. `getAccounts` needs an account-level or global user. A site-level user can work only inside its site: `getAccounts` and calls that filter by `accountIds` return HTTP 403 for it. Among the predefined roles, Admin has every permission listed on this page. IR Team has all of them except Groups: move to group, and SOC also lacks STAR Custom Rules: manage. Viewer has read permissions only. Custom roles can differ.
4. Set the token expiry date, which SentinelOne requires for a service user. Generate the API token and copy it. SentinelOne shows the token once. Before the token expires, generate a new one for the service user. This revokes the existing token, so update the connector right away.
5. In the **API token** field of the connector, paste the token.
