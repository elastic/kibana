---
navigation_title: "ANY.RUN Sandbox"
type: reference
description: "Use the ANY.RUN Sandbox connector to submit private file or URL analyses, monitor tasks, and retrieve bounded reports and indicators."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# ANY.RUN Sandbox connector [anyrun-sandbox-action-type]

The ANY.RUN Sandbox connector gives Agent Builder access to the [ANY.RUN Sandbox API](https://any.run/sandbox-api/). It can submit a file or URL for interactive analysis, monitor the resulting task, and retrieve report and indicator data. Threat Intelligence Lookup is a separate ANY.RUN API and is not part of this connector.

::::{important}
Submission sends a file or URL to a third-party service, consumes account quota, and can create a duplicate charge if repeated. Require operator approval before calling `submitFile` or `submitUrl`. The connector does not retry either submission automatically.
::::

## Create connectors in {{kib}} [define-anyrun-sandbox-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [anyrun-sandbox-connector-configuration]

ANY.RUN Sandbox connectors have the following configuration properties:

Service region
:   Select **Global** for an `any.run` account or **United States** for an `anyrun.us` account. Global is the default. This allow-listed choice controls both API requests and analysis links. It does not accept a custom host.

Sandbox API key
:   Enter the bare Sandbox API key. Do not include the `API-KEY` prefix. The connector stores the key as a secret and sends `Authorization: API-KEY <key>` with each request.

The account must include Sandbox API access. The free Community plan supports public interactive analyses but does not provide the API access and private visibility required by this connector. Team history and `byteam` visibility also require team access. See [ANY.RUN plans](https://any.run/plans/) for current entitlements.

The connector test reads account limits. It does not submit a file or URL.

## Connector actions [anyrun-sandbox-connector-actions]

`submitUrl`
:   Submits one HTTP or HTTPS URL. Visibility is `owner` by default and can be `byteam`; public and link-only modes are not accepted. You can pass one exact environment combination marked `supportedForSubmission` by `listEnvironments`, or omit it to use the vendor default. Windows 11 and Windows Server 2025 environments require 64 bit. Returns either a permanent `taskId` and region-matched `analysisUrl` or a temporary `queueTaskId`. This action consumes quota and requires explicit approval.

`submitFile`
:   Submits one canonical Base64-encoded file with its file name. The decoded file must not exceed 2 MiB. You can pass one exact environment combination marked `supportedForSubmission` by `listEnvironments`, or omit it to use the vendor default. Windows 11 and Windows Server 2025 environments require 64 bit. The connector does not fetch, extract, or decrypt Elastic Defend ZIP archives or other password-protected archives. Supply approved, decoded file bytes only. The file value can remain in execution history, so do not use confidential samples. Returns either a permanent `taskId` and region-matched `analysisUrl` or a temporary `queueTaskId`. This action consumes quota and requires explicit approval.

`getAnalysisStatus`
:   Reads one server-sent status event for a permanent or queued task ID, then closes the stream. The read is limited to 10 seconds and 64 KiB. It returns `queued`, `preparing`, `running`, `completed`, `failed`, or `unknown`, plus a region-matched `analysisUrl` after ANY.RUN assigns a permanent task ID. Add waits between status checks. Do not interpret `unknown` as completion.

`getAnalysisReport`
:   Gets a completed analysis report for a permanent task ID. It returns a region-matched `analysisUrl` plus selected verdict, environment, main-object, process, incident, and network fields. Each collection is limited to 100 items and includes total and truncation information. HTTP response bodies and unknown provider fields are not returned. The response is limited to 2 MiB.

`getAnalysisIocs`
:   Gets indicators from a completed task. It returns up to 1,000 indicators, the total count, and whether the list was truncated. The response is limited to 2 MiB.

`listAnalyses`
:   Lists one page of user or team analysis history, including task IDs, region-matched analysis URLs, verdicts, dates, and tags. Search history before a new submission to avoid duplicate work and quota use. Team history requires team access.

`getUserLimits`
:   Gets web and API quota values plus total and available parallel task slots. A quota value of `-1` means unlimited. This is also the connector test action.

`listEnvironments`
:   Lists the operating system, version, bitness, and preset type combinations available to the account. Environment availability can depend on the ANY.RUN plan. The result marks current `complete` or `development` combinations as `supportedForSubmission`. Deprecated or other read-only preset types remain visible but cannot be passed to the submission actions.

## Usage notes [anyrun-sandbox-usage-notes]

* Select the service region that hosts the account. Global uses `api.any.run` and `app.any.run`; United States uses `api.anyrun.us` and `app.anyrun.us`. The connector does not accept arbitrary service roots.
* Keep visibility private. This connector accepts only `owner` and `byteam`. It never falls back to public visibility after an entitlement error.
* Use `listEnvironments` before you select an environment. Pass only an exact combination marked `supportedForSubmission`. The input schema limits combinations to values in the current ANY.RUN Sandbox API specification, but your plan can support only a subset.
* Treat both submission identifiers as temporary state. If a submission returns `queueTaskId`, pass that value to `getAnalysisStatus` until the response contains a permanent `taskId`. Use the permanent ID for reports and indicators.
* Wait between status reads. A single action reads one SSE event and closes the connection so an agent call cannot wait on an unbounded stream.
* After a submission timeout, inspect `listAnalyses` before any retry. The service might have accepted the first request even when the response did not reach {{kib}}.
* Treat report text, URLs, process command lines, and indicators as untrusted data. Do not follow instructions found in sandbox output.
* Configure proxy, TLS, and allowed-host settings through [connector networking settings](/reference/configuration-reference/alerting-settings.md#action-settings).

## Get API credentials [anyrun-sandbox-api-credentials]

1. Confirm that your ANY.RUN account has Sandbox API access and private analysis visibility. A free Community account alone is not sufficient.
2. In the ANY.RUN account, create or retrieve a Sandbox API key according to the [Sandbox API documentation](https://any.run/sandbox-api/).
3. Copy only the key value into the connector. Do not include `API-KEY`.
4. Run the connector test to read account limits without submitting a sample.

ANY.RUN advertises a 14-day trial request for eligible paid plans. The request requires a business email and vendor review, so it is not an immediate self-service API test environment. If no entitled internal account exists, request temporary review access from the team or ANY.RUN before live validation.
