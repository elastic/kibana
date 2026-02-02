---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/action-types.html
navigation_title: Connectors
applies_to:
  serverless: ga
  stack: ga
---
# Kibana connectors [action-types]

:::{important}
These Kibana connectors are used to connect to external services for GenAI, alerting, and case management use cases.

To learn about connectors for syncing data to {{es}} for search use cases, refer to [content connectors](elasticsearch://reference/search-connectors/index.md).
:::

Connectors provide a central place to store connection information for services and integrations with Elastic or third-party systems.

If you're using connectors for alerting or case management, you can [create rules](docs-content://explore-analyze/alerts-cases/alerts/create-manage-rules.md) and [add actions](docs-content://explore-analyze/alerts-cases/alerts/create-manage-rules.md#defining-rules-actions-details) that use connectors to send notifications when conditions are met.

{{kib}} provides connectors for LLM providers, Elastic Stack features, and third-party alerting and case management platforms.

## Required permissions [_required_permissions_2]

Access to connectors is granted based on your privileges to alerting-enabled features. For more information, go to [Security](docs-content://explore-analyze/alerts-cases/alerts/alerting-setup.md#alerting-security).

## Available connectors

{{kib}} provides the following connectors, grouped by category.

:::{dropdown} Generative AI

:::{include} connectors-kibana/_snippets/gen-ai-connectors-list.md
:::

:::

:::{dropdown} Elastic Stack

:::{include} connectors-kibana/_snippets/elastic-connectors-list.md
:::

:::

:::{dropdown} Alerting and case management

:::{include} connectors-kibana/_snippets/alerting-cases-connectors-list.md
:::

:::

::::{note}
Some connector types are paid commercial features, while others are free. For a comparison of the Elastic subscription levels, go to [the subscription page](https://www.elastic.co/subscriptions).
::::


## Find available connectors [connectors-list]

In **{{stack-manage-app}} > {{connectors-ui}}**, you can find a list of the connectors in the current space. You can use the search bar to find specific connectors by name and type. The **Type** dropdown also enables you to filter to a subset of connector types.

:::{image} images/connector-filter-by-type.png
:alt: Filtering the connector list by types of connectors
:screenshot:
:::

You can delete individual connectors using the trash icon. Alternatively, select multiple connectors and delete them in bulk using the **Delete** button.

:::{image} images/connector-delete.png
:alt: Deleting connectors individually or in bulk
:screenshot:
:::

::::{note}
You can delete a connector even if there are still actions referencing it. When this happens the action will fail to run and errors appear in the {{kib}} logs.

::::


## Creating a new connector [creating-new-connector]

New connectors can be created with the **Create connector** button, which guides you to select the type of connector and configure its properties.

:::{image} images/connector-select-type.png
:alt: Connector select type
:width: 600px
:screenshot:
:::

After you create a connector, it is available for use any time you set up an action in the current space.

For out-of-the-box and standardized connectors, refer to [preconfigured connectors](/reference/connectors-kibana/pre-configured-connectors.md).

::::{tip}
You can also manage connectors as resources with the [Elasticstack provider](https://registry.terraform.io/providers/elastic/elasticstack/latest) for Terraform. For more details, refer to the [elasticstack_kibana_action_connector](https://registry.terraform.io/providers/elastic/elasticstack/latest/docs/resources/kibana_action_connector) resource.
::::


## Managing connectors [connector-management]

Rules use connectors to route actions to different destinations like log files, ticketing systems, and messaging tools. While each {{kib}} app can offer their own types of rules, they typically share connectors. **{{stack-manage-app}} > {{connectors-ui}}** offers a central place to view and manage all the connectors in the current space.

:::{image} images/connector-listing.png
:alt: Example connector listing in the {{rules-ui}} UI
:screenshot:
:::


## Preconfigured connectors

If you are running Kibana on-prem, you can preconfigure a connector to have all the information it needs prior to startup by adding it to the kibana.yml file. Refer to [preconfigured connectors](/reference/connectors-kibana/pre-configured-connectors.md) for more information.


## Connector networking configuration [_connector_networking_configuration]

Use the [action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.


## Importing and exporting connectors [importing-and-exporting-connectors]

To import and export connectors, use the [Saved Objects Management UI](docs-content://explore-analyze/find-and-organize/saved-objects.md).

:::{image} images/connectors-import-banner.png
:alt: Connectors import banner
:screenshot:
:width: 400px
:::

If a connector is missing sensitive information after the import, a **Fix** button appears in **{{connectors-ui}}**.

:::{image} images/connectors-with-missing-secrets.png
:alt: Connectors with missing secrets
:screenshot:
:::


## Monitoring connectors [monitoring-connectors]

The [Task Manager health API](docs-content://deploy-manage/monitor/kibana-task-manager-health-monitoring.md) helps you understand the performance of all tasks in your environment. However, if connectors fail to run, they will report as successful to Task Manager. The failure stats will not accurately depict the performance of connectors.

For more information on connector successes and failures, refer to the [Event log index](docs-content://explore-analyze/alerts-cases/alerts/event-log-index.md).
