---
navigation_title: "Observability AI Assistant"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/obs-ai-assistant-action-type.html
---

# Observability AI Assistant connector and action [obs-ai-assistant-action-type]

::::{warning}
This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
::::

The Observability AI Assistant connector adds AI-driven insights and custom actions to your workflow.

To learn how to interact with the assistant through this connector, refer to the [Observability AI Assistant](docs-content://explore-analyze/ai-assistant.md) documentation.

## Create connectors in {{kib}} [define-obs-ai-assistant-ui]

To use this connector, you must have been granted access to use the Observability AI Assistant feature. You cannot manage this connector in **{{stack-manage-app}} > {{connectors-ui}}** or by using APIs. You also cannot create an Observability AI Assistant [preconfigured connector](/reference/connectors-kibana/pre-configured-connectors.md). It is available only when you're creating a rule in {{kib}}. For example:

:::{image} ../images/obs-ai-assistant-action.png
:alt: Add an Observability AI Assistant action while creating a rule in the Observability UI
:screenshot:
:::

::::{note}
You can have only one Observability AI Assistant action in each rule.
::::

### Connector configuration [obs-ai-assistant-connector-configuration]

Observability AI Assistant connectors have the following configuration properties:

Connector
:   The name of the connector to use to send requests to your AI provider. For more information, refer to [OpenAI](/reference/connectors-kibana/openai-action-type.md) or [{{bedrock}}](/reference/connectors-kibana/bedrock-action-type.md).

Message
:   A message containing the prompt to send to the Observability AI Assistant. The message can specify a set of tasks for the assistant to perform, such as creating a graph or report, and it can call an available connector to send messages to an external system, such as Slack.

::::{note}
Currently you can only send messages to a Slack webhook. Support for additional connectors will be added in the future.
::::

For example, you can create a rule that sends the following prompt to the AI Assistant when an error count threshold is breached:

```text
High error count alert has triggered. Execute the following steps:
  - create a graph of the error count for the service impacted by the alert
  for the last 24h
  - to help troubleshoot, recall past occurrences of this alert, plus any
  other active alerts. Generate a report with all the found information
  and send it to the Slack connector as a single message. Also include
  the link to this conversation in the report.
```

## Test connectors [obs-ai-assistant-action-configuration]

You cannot test or edit these connectors in {{kib}} or by using APIs.
