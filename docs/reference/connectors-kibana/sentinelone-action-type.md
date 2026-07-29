---
navigation_title: "SentinelOne"
type: reference
description: "Use the SentinelOne connector to run response actions through the SentinelOne Management Console REST API."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/sentinelone-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# SentinelOne connector [sentinelone-action-type]

The SentinelOne connector communicates with SentinelOne Management Console via REST API.

To use this connector, you must have authority to run {{endpoint-sec}} connectors, which is an **{{connectors-feature}}** sub-feature privilege. Refer to [{{kib}} privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md).

## Create connectors in {{kib}} [define-sentinelone-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

:::{image} ../images/sentinelone-connector.png
:alt: SentinelOne connector
:screenshot:
:::

### Connector configuration [sentinelone-connector-configuration]

SentinelOne connectors have the following configuration properties:

API token
:   A SentinelOne API token created by the user.

URL
:   The SentinelOne tenant URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

## Test connectors [sentinelone-action-parameters]

You can test connectors as you're creating or editing the connector in {{kib}}.
For example:

:::{image} ../images/sentinelone-connector-test.png
:alt: SentinelOne connector test
:screenshot:
:::

## Connector networking configuration [sentinelone-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
