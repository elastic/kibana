---
navigation_title: "Prometheus"
type: reference
description: "Use the Prometheus connector to run PromQL queries against Prometheus, and to read, silence, and manage alerts and alert groups in Alertmanager."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Prometheus connector [prometheus-action-type]

The Prometheus connector spans two related self-hosted services under one connector: the [Prometheus server HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/) for PromQL reads, and the [Alertmanager HTTP API v2](https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml) for the actionable alert lifecycle. Prometheus has no incident object of its own, so a workflow's incident lifecycle is Alertmanager silences plus alert-state reads.

Use the connector's PromQL actions to check a live metric or a trend over time, and its Alertmanager actions to read what is firing and mute expected noise — for example, during a deploy or maintenance window — without opening the Prometheus or Alertmanager UI or hand-writing API calls. Alertmanager's core lifecycle primitive is the silence: mute a set of alerts matching label matchers for a time window, then let it expire (or expire it early) to allow those alerts to fire again.

Prometheus and Alertmanager are self-hosted, so the target instance(s) must be network-reachable from {{kib}}.

## Create connectors in {{kib}} [define-prometheus-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [prometheus-connector-configuration]

Prometheus connectors have the following configuration properties:

Alertmanager URL
:   The base URL of the Alertmanager instance, for example `https://alertmanager.example.com`. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

Prometheus server URL (optional)
:   The base URL of the Prometheus server associated with this Alertmanager, for example `https://prometheus.example.com`. Required for the `queryPrometheus`, `queryRangePrometheus`, `listPrometheusAlerts`, `listPrometheusRules`, `listPrometheusTargets`, `getPrometheusSeries`, and `listPrometheusLabelValues` actions — leave empty if you don't need any of these. Reuses the credential configured in the following section. This host must also be permitted by `xpack.actions.allowedHosts` when set.

### Authentication [prometheus-connector-authentication]

**Username and password**

Username
:   The username configured for HTTP basic authentication on the Alertmanager instance — either the `basic_auth_users` setting in Alertmanager's own `--web.config.file`, or an account on a reverse proxy placed in front of it.

Password
:   The password for that account.

**Bearer token**

Bearer token
:   A bearer token accepted by a reverse proxy or gateway placed in front of Alertmanager and Prometheus. Neither Alertmanager nor Prometheus has built-in bearer token support, so this option only applies if such a proxy is in place.

## Test connectors [prometheus-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the Alertmanager status API (`GET /api/v2/status`) to verify connectivity and credentials.

## Connector actions [prometheus-connector-actions]

The Prometheus connector has the following actions:

### Alertmanager actions

`listAlerts`
:   List current alerts. Optional filters: `active`, `silenced`, `inhibited`, `unprocessed` (booleans, all default to `true`), `filter` (an array of label matcher expressions, for example `alertname="HighCPU"` or `severity=~"critical|warning"`), and `receiver` (a regular expression matching receiver names).

`listSilences`
:   List silences (pending, active, and expired). Optional `filter`, an array of label matcher expressions, same format as `listAlerts`.

`getSilence`
:   Get a single silence by `silenceId`, returning its matchers, time window, and state.

`createSilence`
:   Create a silence to mute alerts matching label matchers for a time window. Requires `matchers` (an array of `{ name, value, isRegex?, isEqual? }` objects — all must match for an alert to be silenced), `startsAt` and `endsAt` (RFC3339 timestamps), `createdBy`, and `comment`. Returns the new silence ID.

`expireSilence`
:   Expire a silence by `silenceId` so the alerts it was muting can fire again immediately, instead of waiting for its `endsAt`.

`listAlertGroups`
:   List alerts grouped by their routing labels — useful for reasoning about a correlated incident rather than individual alerts. Optional filters: `active`, `silenced`, `inhibited`, `muted` (booleans), `filter` (label matcher expressions), and `receiver` (a regex).

`createAlerts`
:   Push one or more synthetic alerts (`alerts`, each with `labels`, optional `annotations`, `startsAt`, `endsAt`, and `generatorURL`) into Alertmanager. The alerts follow normal routing and notification, letting a workflow raise its own alert.

`getStatus`
:   Read the Alertmanager instance status: version, uptime, cluster peers, and the currently loaded configuration.

### Prometheus server actions

These actions require the optional Prometheus server URL to be configured.

`queryPrometheus`
:   Run a PromQL instant query (`query`, optional `time`) against the configured Prometheus server and return the current value(s).

`queryRangePrometheus`
:   Run a PromQL range query (`query`, `start`, `end`, `step`) and return a series of samples — useful for a trend check or a before-and-after comparison.

`listPrometheusAlerts`
:   List firing and pending alerts as seen directly by the Prometheus server, before they reach Alertmanager.

`listPrometheusRules`
:   List the alerting and recording rules currently loaded by the Prometheus server, including each alerting rule's currently active alerts. Optional filters: `type` (`alert` or `record`), `ruleName`, and `ruleGroup`.

`listPrometheusTargets`
:   List scrape targets with their up/down health and last scrape error. Optional `state` filter (`active`, `dropped`, or `any`).

`getPrometheusSeries`
:   Find time series matching one or more series selector expressions (`match`), optionally restricted to a time range (`start`, `end`), without returning sample values.

`listPrometheusLabelValues`
:   List the known values of a label (`label`), optionally restricted by series selector expressions (`match`) and a time range (`start`, `end`).

## Connector networking configuration [prometheus-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. Make sure the Alertmanager URL (and the Prometheus server URL, if configured) are permitted by `xpack.actions.allowedHosts`.

## Get API credentials [prometheus-api-credentials]

Alertmanager does not have built-in user accounts by default — authentication is configured at the web-server layer:

1. On the Alertmanager host, define one or more users under `basic_auth_users` in the file passed to `--web.config.file` (passwords are bcrypt-hashed; see the [HTTPS and authentication docs](https://prometheus.io/docs/alerting/latest/https/)), or configure basic authentication (or bearer token validation, via a reverse proxy) on a reverse proxy placed in front of Alertmanager.
2. Restart (or reload the web config of) Alertmanager so the new credentials take effect.
3. Enter the Alertmanager URL and that username/password (or bearer token) when configuring the connector in {{kib}}.
4. If you also want the Prometheus server actions, enter the associated Prometheus server's URL — it reuses the same credential.
