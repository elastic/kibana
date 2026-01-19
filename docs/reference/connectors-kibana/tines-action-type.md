---
navigation_title: "Tines"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/tines-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# Tines connector [tines-action-type]

The Tines connector uses Tines's [Webhook actions](https://www.tines.com/docs/actions/types/webhook) to send events via POST request.

## Create connectors in {{kib}} [define-tines-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you’re creating a rule. For example:

:::{image} ../images/tines-connector.png
:alt: Tines connector
:screenshot:
:::

### Connector configuration [tines-connector-configuration]

Tines connectors have the following configuration properties:

URL
:   The Tines tenant URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

Email
:   The email used to sign in to Tines.

API Token
:   A Tines API token created by the user. For more information, refer to the [Tines documentation](https://www.tines.com/api/authentication#generate-api-token).

## Test connectors [tines-action-parameters]

You can test connectors as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/tines-params-test.png
:alt: Tines params test
:screenshot:
:::

If you create a rule action that uses the Tines connector, you can likewise configure the POST request that is sent to the Tines webhook action when the rule conditions are met.

### Webhook URL fallback [webhookUrlFallback-tines-configuration]

It is possible that requests to the Tines API to get the stories and webhooks for the selectors hit the 500 results limit. In this scenario, the webhook URL fallback text field will be displayed. You can still use the selectors if the story or webhook exists in the 500 options loaded. Otherwise, you can paste the webhook URL in the test input field; it can be copied from the Tines webhook configuration.

When the webhook URL is defined, the connector will use it directly when an action runs, and the story and webhook selectors will be disabled and ignored. To re-enable the story and webhook selectors, remove the webhook URL value.

:::{image} ../images/tines-webhook-url-fallback.png
:alt: Tines Webhook URL fallback
:screenshot:
:::

## Tines story library [tines-story-library]

In order to simplify the integration with Elastic, Tines offers a set of pre-defined Elastic stories in the Story library. They can be found by searching for "Elastic" in the [Tines Story library](https://www.tines.com/story-library?s=elastic):

:::{image} ../images/tines_elastic_stories.png
:alt: Tines Elastic stories
:screenshot:
:::

They can be imported directly into your Tines tenant.

## Format [tines-format]

Tines connector will send the data in JSON format.

The message contains fields such as `alertId`, `date`, `_index`, `kibanaBaseUrl`, along with the `rule` and `params` objects.

The number of alerts (signals) can be found at `state.signals_count`.

The alerts (signals) data is stored in the `context.alerts` array, following the [ECS](ecs://reference/ecs-field-reference.md) format.
