---
navigation_title: "CrowdStrike Falcon"
description: "Triage alerts and cases, look up and contain hosts, run Real Time Response and on-demand scans, manage custom IOCs and IOA rules, check reputation and detonate files with the CrowdStrike Falcon connector."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# CrowdStrike Falcon connector [crowdstrike2-action-type]

The CrowdStrike Falcon connector connects to the CrowdStrike Falcon API. It searches and updates alerts and cases, looks up hosts and their containment state, contains hosts and lifts containment, manages host group membership, runs Real Time Response (RTR) commands and on-demand scans, manages custom indicators of compromise (IOCs), custom indicator of attack (IOA) rules and quarantined files, searches IOA exclusions, checks file and URL reputation with Falcon Intelligence, detonates files and URLs in Falcon Sandbox, searches Spotlight vulnerabilities, and runs Falcon Next-Gen SIEM searches.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Create connectors in {{kib}} [define-crowdstrike2-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [crowdstrike2-connector-configuration]

CrowdStrike Falcon connectors have the following configuration properties:

Falcon cloud
:   The cloud of your Falcon tenant: US-1 (`api.crowdstrike.com`), US-2 (`api.us-2.crowdstrike.com`), US-3 (`api.us-3.crowdstrike.com`), EU-1 (`api.eu-1.crowdstrike.com`), US-GOV-1 (`api.laggar.gcw.crowdstrike.com`), US-GOV-2 (`api.us-gov-2.crowdstrike.mil`), or Custom.

API URL
:   The HTTPS base URL of the Falcon API. Used only when the Falcon cloud is Custom. The host must be allowed by the {{kib}} `xpack.actions.allowedHosts` setting.

Token URL
:   The API URL of your Falcon cloud followed by `/oauth2/token`, for example `https://api.us-2.crowdstrike.com/oauth2/token`. It must be on the same host as the selected Falcon cloud; the connector refuses to send the credentials anywhere else.

Client ID
:   The client ID of a Falcon API client.

Client secret
:   The secret of the same API client.

## Test connectors [crowdstrike2-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test requests an access token and lists one host, which confirms the client ID and secret, the Falcon cloud, and the **Hosts: Read** scope.

## Connector actions [crowdstrike2-connector-actions]

The CrowdStrike Falcon connector exposes the following actions. List and search actions return one page and the position of the next one (`next_offset`, or `next_after` for cursor-paged actions).

`getAgentDetails`
:   Get host records for Falcon device IDs: hostname, platform and OS version, sensor version, first and last seen, IP and MAC addresses, host groups, and the containment state (`normal`, `containing`, `contained`, `lift_pending`).

`searchDevices`
:   Search the host inventory with a Falcon Query Language (FQL) filter, for example `hostname:'web-01'`. Returns device IDs.

`getAgentOnlineStatus`
:   Get the sensor connection state (online, offline or unknown) for up to 100 device IDs.

`containHost`
:   Network-contain hosts. The connector first reads each host's containment state: a host that is already `contained` or `containing` is skipped, and an unknown device ID is reported as `notFound`; only the other hosts are sent. Returns `outcomes`, one per device ID with the status `requested`, `skipped` (with the reason), `notFound` or `failed` (with Falcon's message). Containment is asynchronous: read the state back with `getAgentDetails`.

`liftContainment` _(not yet available)_
:   Lift network containment on hosts. Like `containHost`, the connector first reads each host's state: a host that is already `normal` or `lift_pending` is skipped and an unknown device ID is `notFound`. Returns `outcomes` per device ID.

`listHostGroups`
:   List host groups with their name, type, assignment rule and description.

`addHostGroupMembers` _(not yet available)_
:   Add up to 100 hosts (device IDs) to a static host group, for example a group with a stricter prevention policy. The connector builds the host filter from the device IDs. Undo with `removeHostGroupMembers`. Falcon takes about a minute to show the change: in testing, the group appeared in the host's `groups` (`getAgentDetails`) 40 to 80 seconds later, so wait before you read the host again to check the membership. The connector does not read the membership first and reports every host as `requested` in `outcomes` (`failed` when Falcon names the host in an error), including hosts that are already members.

`removeHostGroupMembers` _(not yet available)_
:   Remove up to 100 hosts (device IDs) from a static host group. The hosts lose the policies of that group. Returns `outcomes` like `addHostGroupMembers`, including hosts that are not members.

`searchAlerts`
:   Search Falcon alerts by status, minimum severity, host, time range, free text or an FQL filter. Returns composite alert IDs. Offset paging stops at 10,000 results.

`getAlertDetails`
:   Get full alert details by composite ID: severity, status, tactic and technique, process and file details, the affected host and the Falcon console link.

`updateAlert`
:   Update alerts in one request: set the status, append a comment, assign or unassign, add or remove tags, and show or hide them in the Falcon console.

`searchCases`
:   Search Falcon cases (Case Management) by FQL filter, free text and sort. Returns case IDs and the total.

`getCaseDetails`
:   Get Falcon cases by ID: status, severity, assignee, tags and the other case fields. IDs that Falcon does not return are listed in `missing_ids`.

`updateCase`
:   Update one case: status, assignee (a Falcon user UUID) or removal of the assignee, name, description and severity, optionally only when the case is still at an expected version. Falcon cases have no comments; comment on the linked alert with `updateAlert`.

`addCaseTags`
:   Add tags to one case. Existing tags are kept. The connector reads the case first and skips a tag the case already has; when every tag is skipped, nothing is sent and the case is returned as read. If Falcon marks the case record as not yet consistent, every tag is sent. Returns `outcomes` per tag (`requested` or `skipped`).

`removeCaseTags`
:   Remove tags from one case. Like `addCaseTags`, a tag the case does not have is skipped. Returns `outcomes` per tag.

`uploadIOC` _(not yet available)_
:   Create custom IOCs (SHA256, MD5, domain, IPv4 or IPv6) with an action, platforms, severity and scope.

`searchIOCs`
:   Search custom IOCs by FQL filter.

`deleteIOC` _(not yet available)_
:   Delete custom IOCs by ID, with an optional audit comment. An IOC that no longer exists is not an error: it is reported as `notFound` in `outcomes`, and the others as `requested`.

`findHostsByIndicator`
:   Find the hosts that observed an indicator, with the number of hosts.

`listIOARules`
:   List custom IOA rule groups with their rules, by FQL filter, free text and sort. A rule is identified by its `instance_id` (Falcon returns no rule `id`). A deleted rule stays in the group's `rules` with `deleted: true` and is removed from `rule_ids`.

`createIOARule` _(not yet available)_
:   Create a custom IOA rule in an existing rule group: rule type, name, severity, action and pattern fields. Falcon creates the rule disabled; enable it with `updateIOARule`. The created rule is returned with its `instance_id`, which `updateIOARule` and `deleteIOARule` take.

`updateIOARule` _(not yet available)_
:   Update one custom IOA rule (for example enable or disable it). Only the fields you send change. The rule group version is used as a lock; when you do not pass it, the connector reads the current version first. If the group changed since that version, Falcon answers `409` (rule group version mismatch, reload data and try again). Returns the updated rule group with its rules.

`deleteIOARule` _(not yet available)_
:   Delete up to 100 custom IOA rules of one rule group by `instance_id`, with an optional audit comment. Deletion is permanent. Returns `outcomes` per rule: `requested`, `notFound` for a rule Falcon reports as not found, or `failed` with Falcon's message.

`searchIOAExclusions`
:   Search IOA exclusions by FQL filter and return their details (name, pattern, regular expressions, host groups), or only their IDs.

`executeRTRCommand`
:   Run a read-only RTR command (such as `ls`, `netstat`, `reg query` or `filehash`) on one or more hosts.

`batchActiveResponderExecuteRTR` _(not yet available)_
:   Run an active-responder RTR command (such as `get`, `kill`, `rm`, `runscript` or `umount`) on a batch of hosts. `put`, `put-and-run` and `run` need the administrator action.

`batchAdminExecuteRTR` _(not yet available)_
:   Run an administrator RTR command, including `put`, `put-and-run` and `run`, on a batch of hosts.

`getRTRCommandStatus`
:   Get the status and output of an RTR command that was still running when its action returned.

`getRTRCloudScripts`
:   List the custom RTR scripts in the Falcon cloud, for use with `runscript -CloudFile`.

`rtrRetrieveFile`
:   Collect one file (up to 1 MiB) from a host. Returns the archive Falcon produces as base64, with its name, SHA256 and size.

`rtrKillProcess` _(not yet available)_
:   Kill a process on a host by process ID.

`rtrListProcesses`
:   List the processes running on a host.

`uploadRTRFile` _(not yet available)_
:   Upload a file (up to 1 MiB) to the RTR put-file library.

`listRTRFiles`
:   List the files in the RTR put-file library.

`deleteRTRFile` _(not yet available)_
:   Delete a file from the RTR put-file library. A file that no longer exists is reported as `notFound` in `outcomes`, not as an error.

`uploadRTRScript` _(not yet available)_
:   Create a custom RTR script.

`deleteRTRScript` _(not yet available)_
:   Delete a custom RTR script. A script that no longer exists is reported as `notFound` in `outcomes`, not as an error.

`listQuarantinedFiles`
:   Search quarantined files by FQL filter or free text.

`applyQuarantineFileAction` _(not yet available)_
:   Release, unrelease or delete quarantined files.

`createScan`
:   Start an on-demand scan on hosts or host groups (at least one is required), with optional paths, exclusions, CPU priority, duration and file-size limits, machine learning levels and end-user notification. Malicious files are quarantined only when `quarantine` is `true`. Returns the scan ID.

    - `file_paths` are folders or files such as `C:\Users\Public\`. Falcon rejects wildcards (`*`) there as invalid path characters; use `scan_exclusions` for patterns.
    - `cpu_priority` goes from `1` (lowest) to `5` (highest). Falcon requires one, so the connector sends `1` when none is given.
    - `pause_duration` must not exceed `max_duration`. Falcon uses a `pause_duration` of `2` when none is given, so a `max_duration` below `2` without `pause_duration` also sets the pause to `max_duration`.
    - Falcon sets `initiated_from` itself (`cloud_adhoc` in testing), so the connector does not send it.

`getScanResults`
:   Get an on-demand scan by ID (status and file counts) and one page of the malicious files it found.

`getFileReputation`
:   Look up a file hash (MD5, SHA1 or SHA256) in Falcon Intelligence.

`getUrlReputation`
:   Look up a URL or domain in Falcon Intelligence.

`detonateUrl`
:   Submit a URL to Falcon Sandbox and return the verdict, threat score and report summary when it is ready.

`detonateFile`
:   Detonate a file (uploaded as base64, up to 1 MiB, or a sample already in Falcon) in Falcon Sandbox.

`spotlightSearchVulnerability`
:   Search Spotlight vulnerabilities by FQL filter, with optional host, remediation, CVE and evaluation details.

`startNgSiemSearch`
:   Start a Next-Gen SIEM search with a CrowdStrike Query Language (CQL) query and a time range. Returns the search ID.

`getNgSiemSearchResults`
:   Get a Next-Gen SIEM search by ID: `done`, the matching events (page them with `offset` and `limit`, up to 1,000 per page) and Falcon's search metadata. While the search runs, `done` is `false`.

`stopNgSiemSearch`
:   Cancel a Next-Gen SIEM search by ID. A finished search is stopped normally; a search Falcon no longer finds (for example an expired one) returns `stopped: false` and the outcome `notFound` instead of an error.

## Choose between the CrowdStrike connectors [crowdstrike2-which-connector]

Use the CrowdStrike Falcon connector for Agent Builder tools. The earlier CrowdStrike connector stays available and unchanged, and keeps working where it is used today: {{elastic-sec}} response actions on CrowdStrike hosts. It is not offered as an Agent Builder tool, so nothing has to be migrated at once.

### Earlier connector actions [crowdstrike2-migration-actions]

| Earlier connector action | Action in this connector | What changes |
|---|---|---|
| Get agent details (device IDs) | `getAgentDetails` (device IDs) | The IDs go in the request body (up to 5,000 per call); each record also shows the host's containment state. |
| Host actions with the contain command | `containHost` (device IDs, optional action parameters) | A separate action. The alert IDs and comment inputs are not carried: Falcon never received them. |
| Host actions with the lift containment command | `liftContainment` (device IDs, optional action parameters) | A separate action. The alert IDs and comment inputs are not carried. |
| Get agent online status (device IDs) | `getAgentOnlineStatus` (device IDs) | The IDs are sent as Falcon documents them (one value per ID). |
| Execute Real Time Response command (command, hosts) | `executeRTRCommand` (read-only), with optional timeout and offline queueing | Only read-only commands are accepted; a command that outlasts the timeout returns a request ID for `getRTRCommandStatus`. |
| Execute Real Time Response command, running a script (`runscript`) | `batchActiveResponderExecuteRTR` or `batchAdminExecuteRTR` | The read-only command action does not accept `runscript`, the only command the earlier action ran. Use the active-responder or administrator action instead, for example with `runscript -CloudFile='<script name>'`. |
| Batch Real Time Response command, active responder (command, hosts) | `batchActiveResponderExecuteRTR`, with optional timeout and offline queueing | Only active-responder commands are accepted; the `put`, `put-and-run` and `run` commands need the administrator action. |
| Batch Real Time Response command, administrator (command, hosts) | `batchAdminExecuteRTR`, with optional timeout and offline queueing | Administrator commands only. |
| Get Real Time Response cloud scripts (no inputs) | `getRTRCloudScripts` (optional filter, page size, position and sort) | Scripts are listed page by page, with the next position returned. |

## Behavior and limitations [crowdstrike2-limitations]

Alerts API
:   The alert actions (`searchAlerts`, `getAlertDetails` and `updateAlert`) use Falcon's unified Alerts API. The legacy detections API, which it supersedes, is not used.

Containment and Real Time Response
:   Containment is asynchronous: `getAgentDetails` reports `containing`, then `contained`, and `lift_pending`, then `normal`. RTR actions wait up to their timeout (at most 300 seconds); a host whose command is still running returns `complete: false` with a `cloud_request_id` for `getRTRCommandStatus`. `rtrRetrieveFile` returns files up to 1 MiB.

Earlier runscript commands
:   The earlier connector ran `runscript` through Execute RTR command. In this connector, `executeRTRCommand` (read-only) accepts only read-only commands and rejects `runscript`. Use `batchActiveResponderExecuteRTR` or `batchAdminExecuteRTR` instead, for example with the command `runscript -CloudFile='<script name>'`, and use a connector whose API client holds that tier's scope.

Real Time Response sessions
:   Real Time Response sessions are opened and closed by the connector. Batch sessions, used by `executeRTRCommand`, `batchActiveResponderExecuteRTR`, `batchAdminExecuteRTR` and `rtrRetrieveFile`, open one session per host; the connector deletes each host's session when that host's command completes or fails (`rtrRetrieveFile`: when the file is returned or the action fails). Single-host sessions, used by `rtrKillProcess` and `rtrListProcesses`, are deleted when the command completes or fails. A session is kept when the command is still running at the timeout (so that its status can be read; `rtrRetrieveFile`: while the file is still being prepared) or when the host is offline and the command is queued for it (deleting the session would drop the queued command); Falcon closes a kept session after 10 minutes without activity. A failed delete is only logged and does not fail the action. The batch and session IDs in the results (`batch_id`, `session_id`) are for audit only; no action takes them as input.

Real Time Response timeout
:   Real Time Response commands wait 30 seconds by default (60 seconds for `rtrRetrieveFile`) and at most 300 seconds (Falcon's 5-minute maximum). A command that is still running at the timeout returns a request ID (`cloud_request_id`) per host; read its result with `getRTRCommandStatus`.

Next-Gen SIEM search
:   Next-Gen SIEM search uses the same client ID and secret as the other actions, but the API client also needs the **NGSIEM** scope (Read and Write), which is separate from the endpoint scopes; without it Falcon answers with an access-denied error that the connector reports with the scope name. A search runs in three steps: `startNgSiemSearch` with a CQL query and a time range returns a search ID; `getNgSiemSearchResults` returns `done: false` while the search runs, so repeat it with a wait of at least 2 seconds until `done` is `true`, then page the events with `offset` and `limit` (up to 1,000 per page); `stopNgSiemSearch` cancels a search that is no longer needed.

    Searches run on the `search-all` view, which covers every repository the API client may read. To search one repository, add `#repo=<repository name>` to the query. Time ranges are relative (for example `15m`, `24h`, `7d`, and `now`) or epoch milliseconds (13 digits); `start` cannot be `now`, and `end` defaults to `now`. Searches are never live. A failed start is not repeated on a server error, because a repeat could start a second search. The vendor documentation does not give the query and time-range limits, the maximum page size, how long a finished search stays readable or the console label of the scope: keep time ranges short and stop searches you no longer need.

Saved inputs
:   Action inputs are saved with the step or conversation that runs them, including the content of `uploadRTRFile` and `uploadRTRScript`, the file content of `detonateFile` and Real Time Response command lines. Do not put secrets, such as passwords or API keys, in command lines, script content or file content.

Not available
:   - Environment CrowdScore: CrowdStrike decommissioned the incidents and CrowdScore endpoints, and no other Falcon API returns the CrowdScore, so the connector has no CrowdScore action.
    - Comments on Falcon cases: Falcon Case Management has no comment or note endpoint. `updateCase` changes status, assignee, name, description and severity, and the tag actions change tags; for a written trail, add a comment to the case's alert with `updateAlert`.
    - Falcon incidents: the incidents endpoints are decommissioned; use the case actions (`searchCases`, `getCaseDetails`, `updateCase`, `addCaseTags`, `removeCaseTags`).

## Get API credentials [crowdstrike2-api-credentials]

To use the CrowdStrike Falcon connector, create an API client in the Falcon console:

1. In the Falcon console, go to **Support and resources > API clients and keys**.
2. Click **Create API client** and give it a name.
3. Grant only the scopes for the actions you plan to use:
   - **Hosts**: Read (host lookups, the connector test) and Write (`containHost`, `liftContainment`).
   - **Host groups**: Read (`listHostGroups`) and Write (`addHostGroupMembers`, `removeHostGroupMembers`).
   - **Alerts**: Read (`searchAlerts`, `getAlertDetails`) and Write (`updateAlert`).
   - **IOC Management**: Read (`searchIOCs`, `findHostsByIndicator`) and Write (`uploadIOC`, `deleteIOC`).
   - **Real time response**: Read (read-only commands) and Write (active-responder commands, `rtrRetrieveFile`, `rtrKillProcess`).
   - **Real time response (admin)**: Write (administrator commands and the script and put-file library).
   - **Quarantined Files**: Read and Write.
   - **Cases** (Case Management): Read (`searchCases`, `getCaseDetails`) and Write (`updateCase`, `addCaseTags`, `removeCaseTags`).
   - **Custom IOA rules**: Read (`listIOARules`) and Write (`createIOARule`, `updateIOARule`, `deleteIOARule`).
   - **IOA exclusions**: Read (`searchIOAExclusions`).
   - **On-demand scans (ODS)**: Read (`getScanResults`) and Write (`createScan`).
   - With the matching subscriptions: **Indicators (Falcon Intelligence)**: Read, **Sandbox (Falcon Sandbox)**: Write, **Sample uploads**: Write, and **Vulnerabilities (Spotlight)**: Read.
   - **NGSIEM**: Read and Write (API scope `humio-auth-proxy`) for the Next-Gen SIEM search actions. The actions are verified with both ticked; whether Read alone is enough has not been verified.
4. Click **Create**, then copy the client ID and secret. The secret is shown only once.
5. Note the base URL shown with the client; it identifies your Falcon cloud.

### Real Time Response tiers [crowdstrike2-rtr-tiers]

Real Time Response has three permission tiers: read-only, active responder and administrator. Create one connector per tier, each with its own Falcon API client that holds that tier's Real Time Response scope and no higher tier, plus **Hosts: Read** (the connector test and host lookups need it; without it the connector test fails with a 403). Use the connector with the lowest tier each task needs. If a responder or administrator command fails with a permission error when the session starts, also add **Real time response: Read** to that tier's API client. A read-only connector cannot run responder or administrator commands, whatever the request.

Commands each tier accepts:

- **Read-only** (`executeRTRCommand`): `cat`, `cd`, `clear`, `env`, `eventlog`, `filehash`, `getsid`, `help`, `history`, `ipconfig`, `ls`, `mount`, `netstat`, `ps`, `reg query`.
- **Active responder** (`batchActiveResponderExecuteRTR`): the read-only commands plus `cp`, `encrypt`, `get`, `kill`, `map`, `memdump`, `mkdir`, `mv`, `reg set`, `reg delete`, `reg load`, `reg unload`, `restart`, `rm`, `runscript`, `shutdown`, `umount`, `unmap`, `update`, `xmemdump`, `zip`.
- **Administrator** (`batchAdminExecuteRTR`): the active-responder commands plus `put`, `put-and-run` and `run`.

Falcon accepts `put`, `put-and-run` and `run` only at the administrator tier, so the active-responder action rejects them. Some requests list `put` among the active-responder commands; Falcon's API reference allows it only at the administrator tier, so `put` is accepted only by `batchAdminExecuteRTR`. Any other command is rejected before a session is opened.

### API scopes and the actions that need them [crowdstrike2-scopes]

| Scope | Actions |
|---|---|
| Hosts: Read | `getAgentDetails`, `getAgentOnlineStatus`, `searchDevices`, `findHostsByIndicator` (with IOC Management: Read), `containHost` and `liftContainment` (state read, with Hosts: Write), the connector test |
| Hosts: Write | `containHost`, `liftContainment` |
| Host groups: Read | `listHostGroups` |
| Host groups: Write | `addHostGroupMembers`, `removeHostGroupMembers` |
| Alerts: Read | `searchAlerts`, `getAlertDetails` |
| Alerts: Write | `updateAlert` |
| Cases (Case Management): Read | `searchCases`, `getCaseDetails`, `addCaseTags` and `removeCaseTags` (case read, with Cases: Write) |
| Cases (Case Management): Write | `updateCase`, `addCaseTags`, `removeCaseTags` |
| IOC Management: Read | `searchIOCs`, `findHostsByIndicator` (with Hosts: Read) |
| IOC Management: Write | `uploadIOC`, `deleteIOC` |
| Custom IOA rules: Read | `listIOARules` |
| Custom IOA rules: Write | `createIOARule`, `updateIOARule`, `deleteIOARule` |
| IOA exclusions: Read | `searchIOAExclusions` |
| On-demand scans (ODS): Read | `getScanResults` |
| On-demand scans (ODS): Write | `createScan` |
| Quarantined Files: Read | `listQuarantinedFiles` |
| Quarantined Files: Write | `applyQuarantineFileAction` |
| Real time response: Read (read-only tier) | `executeRTRCommand`, `rtrListProcesses`, `getRTRCommandStatus` (read-only commands) |
| Real time response: Write (active-responder tier) | `batchActiveResponderExecuteRTR`, `rtrRetrieveFile`, `rtrKillProcess`, `getRTRCommandStatus` (active-responder commands) |
| Real time response (admin): Write (administrator tier) | `batchAdminExecuteRTR`, `getRTRCloudScripts`, `uploadRTRFile`, `listRTRFiles`, `deleteRTRFile`, `uploadRTRScript`, `deleteRTRScript`, `getRTRCommandStatus` (administrator commands) |
| Indicators (Falcon Intelligence): Read | `getFileReputation`, `getUrlReputation` |
| Sandbox (Falcon Sandbox): Write | `detonateUrl`, `detonateFile` |
| Sample uploads: Write | `detonateFile` (uploads the file first) |
| Vulnerabilities (Spotlight): Read | `spotlightSearchVulnerability` |
| NGSIEM: Read and Write (API scope `humio-auth-proxy`; Read alone not verified) | `startNgSiemSearch`, `getNgSiemSearchResults`, `stopNgSiemSearch` (the vendor names no separate scope for stopping) |
