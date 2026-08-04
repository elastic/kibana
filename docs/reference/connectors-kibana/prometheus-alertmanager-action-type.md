---
navigation_title: "Prometheus Alertmanager"
type: reference
description: "Use the Prometheus Alertmanager connector to read alerts and alert groups, and to create, list, and expire silences to mute noise, with optional Prometheus server enrichment."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Prometheus Alertmanager connector [prometheus-alertmanager-action-type]

The Prometheus Alertmanager connector calls the [Alertmanager HTTP API v2](https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml) so a workflow can read alerts and drive the silence lifecycle — create, list, get, and expire — to mute noise during a maintenance window or a known incident, without opening the Alertmanager UI or hand-writing API calls. Alertmanager's core lifecycle primitive is the silence: mute a set of alerts matching label matchers for a time window, then let it expire (or expire it early) to allow those alerts to fire again.

Optionally, the connector can also read from the associated [Prometheus server HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/) to enrich an alert with a live metric value or inspect the alerting/recording rules that produce alerts.

Alertmanager (and Prometheus) are self-hosted, so the target instance must be network-reachable from {{kib}}.

## Create connectors in {{kib}} [define-prometheus-alertmanager-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [prometheus-alertmanager-connector-configuration]

Prometheus Alertmanager connectors have the following configuration properties:

Alertmanager URL
:   The base URL of the Alertmanager instance, for example `https://alertmanager.example.com`. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

Prometheus server URL (optional)
:   The base URL of the Prometheus server associated with this Alertmanager, for example `https://prometheus.example.com`. Only required for the `queryPrometheus`, `listPrometheusAlerts`, and `listPrometheusRules` actions — leave empty if you don't need Prometheus enrichment. Reuses the username and password configured in the following section. This host must also be permitted by `xpack.actions.allowedHosts` when set.

### Authentication [prometheus-alertmanager-connector-authentication]

**Username and password**

Username
:   The username configured for HTTP basic authentication on the Alertmanager instance — either the `basic_auth_users` setting in Alertmanager's own `--web.config.file`, or an account on a reverse proxy placed in front of it.

Password
:   The password for that account.

## Test connectors [prometheus-alertmanager-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the Alertmanager status API (`GET /api/v2/status`) to verify connectivity and credentials.

## Connector actions [prometheus-alertmanager-connector-actions]

The Prometheus Alertmanager connector has the following actions:

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

`queryPrometheus`
:   Run a PromQL instant query (`query`, optional `time`) against the configured Prometheus server and return the current value(s). Requires the optional Prometheus server URL to be configured.

`listPrometheusAlerts`
:   List firing and pending alerts as seen directly by the Prometheus server, before they reach Alertmanager. Requires the optional Prometheus server URL to be configured.

`listPrometheusRules`
:   List the alerting and recording rules currently loaded by the Prometheus server, including each alerting rule's currently active alerts. Optional filters: `type` (`alert` or `record`), `ruleName`, and `ruleGroup`. Requires the optional Prometheus server URL to be configured.

## Connector networking configuration [prometheus-alertmanager-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. Make sure the Alertmanager URL (and the Prometheus server URL, if configured) are permitted by `xpack.actions.allowedHosts`.

## Get API credentials [prometheus-alertmanager-api-credentials]

Alertmanager does not have built-in user accounts by default — basic authentication is configured at the web-server layer:

1. On the Alertmanager host, define one or more users under `basic_auth_users` in the file passed to `--web.config.file` (passwords are bcrypt-hashed; see the [HTTPS and authentication docs](https://prometheus.io/docs/alerting/latest/https/)), or configure basic authentication on a reverse proxy placed in front of Alertmanager.
2. Restart (or reload the web config of) Alertmanager so the new credentials take effect.
3. Enter the Alertmanager URL and that username/password when configuring the connector in {{kib}}.
4. If you also want the Prometheus enrichment actions, enter the associated Prometheus server's URL — it reuses the same username and password.
