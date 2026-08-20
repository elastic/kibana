---
navigation_title: "Google Cloud Monitoring"
type: reference
description: "Use the Google Cloud Monitoring connector to find, silence, and snooze GCP alerting policies, and to enrich alerts with metric, uptime, and SLO data."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google Cloud Monitoring connector [google-cloud-monitoring-action-type]

The Google Cloud Monitoring connector wraps the [Cloud Monitoring API v3](https://cloud.google.com/monitoring/api/ref_v3/rest) so that AI agents and workflows can locate the alerting policy behind a firing alert, silence or reactivate it, suppress alerts for a maintenance window, and enrich the alert with metric, Uptime check, and Service Level Objective (SLO) data. Cloud Monitoring has no incidents REST resource, so this connector drives alert suppression through the policy's `enabled` flag and through Snoozes rather than an acknowledge-incident call.

## Create connectors in {{kib}} [define-google-cloud-monitoring-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-cloud-monitoring-connector-configuration]

Google Cloud Monitoring connectors have the following configuration properties:

GCP Project ID
:   The default GCP project ID whose alerting policies, snoozes, and metrics this connector manages, such as `my-gcp-project`. Every action accepts an optional `projectId` input to target a different project for a single call.

## Test connectors [google-cloud-monitoring-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies Cloud Monitoring API access by listing alert policies in the configured project.

The Google Cloud Monitoring connector has the following actions. Every action accepts either the bare resource ID or the full resource name (for example `projects/{project}/alertPolicies/{id}`) as returned by the corresponding list, get, or create action.

List alert policies
:   List alerting policies in the project, optionally filtered. The starting point for locating the policy behind a firing alert.
    - `filter` (optional): Filter expression, for example `display_name starts_with "Prod"`.
    - `orderBy` (optional): Comma-separated sort fields, prefix with `-` for descending.
    - `pageSize`, `pageToken` (optional): Pagination controls.
    - `projectId` (optional): Overrides the connector's default project for this call.

Get alert policy
:   Get the full definition of a single alerting policy: its conditions, combiner, `enabled` state, notification channels, and documentation.
    - `policyName` (required): Bare alert policy ID or full resource name, from *List alert policies*.
    - `projectId` (optional).

Set alert policy enabled
:   Silence (`enabled: false`) or reactivate (`enabled: true`) an alerting policy — the core lifecycle primitive Cloud Monitoring exposes in place of an acknowledge-incident call. Prefer *Create snooze* for a bounded maintenance window, since a snooze re-enables itself automatically.
    - `policyName` (required).
    - `enabled` (required): `true` or `false`.
    - `projectId` (optional).

Update alert policy
:   Update one or more fields of an existing alerting policy. Only the fields provided are changed, but `notificationChannels` and `conditions` are replaced wholesale (not merged) when set — call *Get alert policy* first to see current values.
    - `policyName` (required).
    - `displayName`, `documentationContent`, `documentationSubject` (optional).
    - `notificationChannels` (optional): Full replacement list of channel IDs or names.
    - `combiner` (optional): `AND`, `OR`, or `AND_WITH_MATCHING_RESOURCE`.
    - `conditions` (optional): Full replacement list of Condition objects (copy from *Get alert policy*'s response).
    - `userLabels` (optional): Full replacement label map.
    - `projectId` (optional).

Create snooze
:   Suppress alerts matching the given alert policies (and optional label filter) for a fixed time window, without disabling the policy. The snooze stops applying automatically after `endTime`.
    - `displayName` (required).
    - `startTime`, `endTime` (required): RFC 3339 / ISO 8601 timestamps.
    - `policyNames` (optional, up to 16): Alert policies this snooze applies to.
    - `filter` (optional): Label filter. Requires exactly one entry in `policyNames`.
    - `projectId` (optional).

List snoozes
:   List current and past snoozes in the project.
    - `filter` (optional): Filter on `interval.start_time` / `interval.end_time`.
    - `pageSize`, `pageToken`, `projectId` (optional).

Update snooze
:   Extend, shorten, or rename an existing snooze so suppression tracks the incident instead of outlasting it. Set `endTime` to a time in the past to end an active snooze immediately.
    - `snoozeName` (required).
    - `displayName`, `startTime`, `endTime` (optional, but at least one is required).
    - `projectId` (optional).

List notification channels
:   List the notification channels configured in the project, so you can see where a policy pages before editing `notificationChannels` with *Update alert policy*.
    - `filter`, `orderBy`, `pageSize`, `pageToken`, `projectId` (optional).

List time series
:   Fetch the raw or aggregated metric values behind a firing alert.
    - `filter` (required): Monitoring filter naming a single metric type.
    - `startTime`, `endTime` (required): RFC 3339 / ISO 8601 timestamps.
    - `alignmentPeriod`, `perSeriesAligner`, `crossSeriesReducer`, `groupByFields` (optional): Aggregation controls.
    - `view` (optional): `FULL` (default) or `HEADERS`.
    - `pageSize`, `pageToken`, `projectId` (optional).

List Uptime check configs
:   List Uptime check configurations in the project, to correlate an availability alert back to the check that detected it.
    - `filter`, `pageSize`, `pageToken`, `projectId` (optional).

List services
:   List the Cloud Monitoring services defined in the project (App Engine, GKE, custom, and so on). Use the ID from a returned service name with *List Service Level Objectives*.
    - `filter`, `pageSize`, `pageToken`, `projectId` (optional).

List Service Level Objectives
:   List the SLOs defined for a service, to read error-budget status while triaging an incident.
    - `serviceId` (required): From *List services*.
    - `filter`, `view` (`DEFAULT` or `EXPLICIT`), `pageSize`, `pageToken`, `projectId` (optional).

:::::{tip}
To triage a firing alert: *List alert policies* (optionally filtering by `displayName`) to find the policy, then *Get alert policy* for its full conditions and notification channels. Use the same filter from the fired condition with *List time series* to see the metric values that triggered it. Prefer *Create snooze* over *Set alert policy enabled* whenever the suppression is meant to end on its own.
:::::

## Connector networking configuration [google-cloud-monitoring-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-cloud-monitoring-api-credentials]

The Google Cloud Monitoring connector uses a Google Cloud service account JSON key.

1. In the [Google Cloud console](https://console.cloud.google.com/), select or create the project that contains the alerting policies, uptime checks, and services you want to manage.
2. Enable the **Cloud Monitoring API** if it is not already enabled.
3. Create a service account for {{kib}}.
4. Grant the service account a Cloud Monitoring IAM role scoped to the actions you need:
   - **Monitoring Viewer** (`roles/monitoring.viewer`) is sufficient for the read-only actions (*List alert policies*, *Get alert policy*, *List snoozes*, *List notification channels*, *List time series*, *List Uptime check configs*, *List services*, *List Service Level Objectives*).
   - **Monitoring Editor** (`roles/monitoring.editor`) is required for the write actions (*Set alert policy enabled*, *Update alert policy*, *Create snooze*, *Update snooze*).
5. Create and download a JSON key for the service account.
6. In {{kib}}, create a Google Cloud Monitoring connector and upload the service account JSON key.
