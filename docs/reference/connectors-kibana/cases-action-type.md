---
navigation_title: "Cases"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/cases-action-type.html
---

# Cases connector and action [cases-action-type]

The Cases connector creates cases in {{kib}} when alerts occur.

## Create connectors in {{kib}} [define-cases-ui]

To use this connector you must have `All` {{kib}} privileges for the **Cases** feature. Depending on the type of rule you want to create and its role visibility, you must have privileges for **Management** or **{{observability}}** case features. For more details, refer to [{{kib}} privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md).

You cannot manage this connector in **{{stack-manage-app}} > {{connectors-ui}}** or by using APIs. You also cannot create a Cases [preconfigured connector](/reference/connectors-kibana/pre-configured-connectors.md). It is available only when you're creating a rule in {{kib}}. For example:

:::{image} ../images/cases-action.png
:alt: Add a cases action while creating a rule in {{kib}} {{rules-ui}}
:screenshot:
:::

::::{note}
You can have only one Cases action in each rule.
::::

### Connector configuration [cases-connector-configuration]

Cases connectors have the following configuration properties:

Group by alert field
:   By default, all alerts are attached to the same case. You can optionally choose a field to use for grouping the alerts; a unique case is created for each group.

Reopen when the case is closed
:   If this option is enabled, closed cases are re-opened when an alert occurs.

Time window
:   By default, alerts are added to an existing case only if they occur within a 7 day time window.

## Test connectors [cases-action-configuration]

You cannot test or edit these connectors in {{kib}} or by using APIs.
