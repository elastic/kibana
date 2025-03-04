---
navigation_title: "SentinelOne"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/sentinelone-action-type.html
---

# SentinelOne connector [sentinelone-action-type]


::::{warning}
This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
::::


The SentinelOne connector communicates with SentinelOne Management Console via REST API.

To use this connector, you must have authority to run {{endpoint-sec}} connectors, which is an **{{connectors-feature}}** sub-feature privilege. Refer to [{{kib}} privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md).


## Create connectors in {{kib}} [define-sentinelone-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

:::{image} ../../images/sentinelone-connector.png
:alt: SentinelOne connector
:class: screenshot
:::


### Connector configuration [sentinelone-connector-configuration]

SentinelOne connectors have the following configuration properties:

API token
:   A SentinelOne API token created by the user.

URL
:   The SentinelOne tenant URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.


## Test connectors [sentinelone-action-parameters]

At this time, you cannot test the SentinelOne connector.

