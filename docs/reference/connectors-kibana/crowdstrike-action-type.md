---
navigation_title: "CrowdStrike"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/crowdstrike-action-type.html
applies_to:
  stack: ga
  serverless:
    observability: ga
    security: ga
---

# CrowdStrike connector [crowdstrike-action-type]

The CrowdStrike connector communicates with CrowdStrike Management Console via REST API.

To use this connector, you must have authority to run {{endpoint-sec}} connectors, which is an **{{connectors-feature}}** sub-feature privilege. Refer to [{{kib}} privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md).

## Create connectors in {{kib}} [define-crowdstrike-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

:::{image} ../images/crowdstrike-connector.png
:alt: CrowdStrike connector
:screenshot:
:::

### Connector configuration [crowdstrike-connector-configuration]

CrowdStrike connectors have the following configuration properties:

CrowdStrike API URL
:   The CrowdStrike tenant URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

CrowdStrike client ID
:   The CrowdStrike API client identifier.

Client secret
:   The CrowdStrike API client secret to authenticate the client ID.

## Test connectors [crowdstrike-action-configuration]

You can test connectors as you’re creating or editing the connector in {{kib}}. For example:

:::{image} ../images/crowdstrike-connector-test.png
:screenshot:
:alt: CrowdStrike connector test
:::

The CrowdStrike action has the following configuration properties:

Agent IDs
:   Get details about one or more CrowdStrike agent IDs.

