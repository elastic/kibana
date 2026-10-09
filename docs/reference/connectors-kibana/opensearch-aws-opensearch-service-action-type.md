---
navigation_title: "OpenSearch (AWS OpenSearch Service)"
type: reference
description: "Use the OpenSearch connector to manage Alerting monitors and alerts, Security Analytics detector alerts and findings, and search and index documents."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# OpenSearch (AWS OpenSearch Service) connector [opensearch-aws-opensearch-service-action-type]

The OpenSearch connector calls the [Alerting](https://docs.opensearch.org/latest/observing-your-data/alerting/api/) and [Security Analytics](https://docs.opensearch.org/latest/security-analytics/api-tools/alert-finding-api/) plugin APIs, plus core document search/index APIs, so a workflow or agent can triage alerts, manage monitors, and read or write cluster data. It works against both a managed [Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html) domain and a self-managed OpenSearch (or Elasticsearch with a compatible security setup) cluster.

## Create connectors in {{kib}} [define-opensearch-aws-opensearch-service-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [opensearch-aws-opensearch-service-connector-configuration]

OpenSearch connectors have the following configuration properties:

Endpoint URL
:   The domain or cluster endpoint URL. For AWS OpenSearch Service, use the auto-generated domain endpoint, for example `https://search-my-domain-abc123.us-east-1.es.amazonaws.com` — a custom CNAME endpoint cannot be used with AWS access key/secret auth, because request signing derives the AWS region from this hostname. For a self-managed cluster, use its full URL, for example `https://opensearch.example.com:9200`.

### Authentication [opensearch-aws-opensearch-service-connector-authentication]

**AWS access key (Amazon OpenSearch Service)**

Access Key ID
:   An IAM access key with `es:ESHttpGet`, `es:ESHttpPost`, `es:ESHttpPut`, and `es:ESHttpDelete` permissions on the domain. Every request is signed with Signature Version 4 (SigV4).

Secret Access Key
:   The AWS IAM secret access key paired with the access key ID above.

**Username and password (self-managed cluster)**

Username
:   An OpenSearch internal user, or a user whose backend role is mapped to a role with the alerting and security-analytics cluster permissions this connector's actions use, plus read/write on the indices you search or index into.

Password
:   The password for that user.

## Test connectors [opensearch-aws-opensearch-service-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls `GET _cluster/health` to verify connectivity and that the credentials can authenticate against the cluster.

## Connector actions [opensearch-aws-opensearch-service-connector-actions]

The OpenSearch connector has the following actions:

`acknowledgeAlert`
:   Acknowledge one or more active alerts (`alertIds`) on a monitor (`monitorId`) so they stop re-notifying. Alerts already `COMPLETED`, `ERROR`, or `ACKNOWLEDGED` come back in the response's `failed` list.

`getAlerts`
:   List Alerting alerts across all monitors, or for one monitor (`monitorId`), optionally filtered by `alertState` or `severityLevel`.

`executeMonitor`
:   Run a monitor (`monitorId`) immediately instead of waiting for its schedule. Set `dryrun` to preview trigger results without sending notification actions.

`getMonitor`
:   Fetch a monitor's full definition (schedule, inputs, triggers) and enabled state by `monitorId`.

`enableMonitor` / `disableMonitor`
:   Resume or suspend scheduled evaluation of a monitor (`monitorId`) without deleting it — useful for silencing a known-noisy monitor during a maintenance window and restoring it afterward.

`searchMonitors`
:   Search for monitors by `name`, source `index`, or `enabled` state. Omit all filters to list monitors.

`createMonitor`
:   Create a new query-level, bucket-level, or doc-level monitor (`monitorType`) with a `schedule`, `inputs`, and `triggers`. The `inputs`/`triggers` shape follows the [OpenSearch monitor definition](https://docs.opensearch.org/latest/observing-your-data/alerting/api/#create-a-query-level-monitor) and varies by monitor type.

`updateMonitor`
:   Update an existing monitor's (`monitorId`) name, schedule, inputs, or triggers. Only the fields you provide are changed. Everything else on the monitor is preserved.

`deleteMonitor`
:   Permanently delete a monitor (`monitorId`). This does not delete alerts already raised by the monitor.

`searchDetectors`
:   Search for Security Analytics detectors by `name` or `detectorType`. Use this to find a detector ID before calling `getDetectorFindings` or `acknowledgeDetectorAlert`.

`acknowledgeDetectorAlert`
:   Acknowledge one or more active alerts (`alertIds`) raised by a Security Analytics detector (`detectorId`). This is a separate alert stream from the Alerting-plugin actions above.

`getDetectorFindings`
:   Retrieve Security Analytics findings (matched Sigma rules or threat-intelligence hits), filtered by `detectorId` or `detectorType`, and optionally by `severity` or `detectionType`.

`listIndices`
:   List indices and their health, status, and document/storage size, optionally filtered by name or `pattern`. Use this to discover which index to pass to `runQuery` or `indexDocument`.

`runQuery`
:   Run a search query DSL request body (`query`) against an `index`, returning the raw `_search` response.

`indexDocument`
:   Write a `document` to an `index`. Provide an explicit `id` to create or fully replace a specific document, or omit it to let OpenSearch generate one.

::::{note}
The Alerting plugin's monitor update endpoint fully replaces a monitor's definition. `enableMonitor`, `disableMonitor`, and `updateMonitor` first read the current monitor and its `seq_no`/`primary_term`, then write back the full definition with only your requested change applied, using those values to avoid clobbering a concurrent change.
::::

## Get API credentials [opensearch-aws-opensearch-service-api-credentials]

**Amazon OpenSearch Service (AWS access key)**

1. Sign in to the [AWS IAM console](https://console.aws.amazon.com/iam/).
2. Create (or choose) an IAM user or role dedicated to this connector.
3. Attach a policy granting `es:ESHttpGet`, `es:ESHttpPost`, `es:ESHttpPut`, and `es:ESHttpDelete` on the domain's ARN (or narrower actions if you only need a subset of the connector's actions).
4. Create an access key for that user (**Security credentials** > **Access keys** > **Create access key**), or use a role's temporary credentials.
5. Copy the domain's endpoint (**Amazon OpenSearch Service console** > your domain > **Domain endpoint**), the **Access key ID**, and the **Secret access key**, and enter them when configuring the connector in {{kib}}.

**Self-managed cluster (username and password)**

1. In OpenSearch Dashboards, go to **Security** > **Internal users** and create a user, or identify an existing one.
2. Go to **Security** > **Roles** and map that user (directly, or through a backend role) to a role granting the cluster permissions the actions you plan to use require (for example `cluster:admin/opendistro/alerting/*` and `cluster:admin/opensearch/securityanalytics/*`), plus read/write index permissions on the indices you search or index into.
3. Enter the cluster's endpoint URL, username, and password when configuring the connector in {{kib}}.
