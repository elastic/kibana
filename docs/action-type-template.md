---
navigation_title: <CONNECTOR_NAME>
type: reference
description: "One factual sentence of about 150 characters that describes what the connector does."
applies_to:
  stack: ga
  serverless: ga
---

% For each new connector, also update the connector TOC at https://github.com/elastic/kibana/blob/main/docs/reference/toc.yml and the list of available connectors at https://github.com/elastic/kibana/blob/main/docs/reference/connectors-kibana.md

# {{CONNECTOR_NAME}} connector [connector-name-action-type]

Include a short description of the connector type: what it connects to, what it does, and how it authenticates.

## Create connectors in {{kib}} [define-connector-name-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule.

%  Add a screenshot (optional)

% :::{image} ../images/connector-type.png
% :alt: {{CONNECTOR-NAME}} connector
% :screenshot:
% :::

### Connector configuration [connector-name-connector-configuration]

{{CONNECTOR-NAME}} connectors have the following configuration properties:

% List of user-facing connector configurations. This should align with the fields available in the Create connector flyout form for this connector type. To include these configuration details in the API documentation, add appropriate files in x-pack/platform/plugins/shared/actions/docs/openapi/components/schemas/ and reference them from oas_docs/overlays/connectors.overlays.yaml 

Property1
:   A short description of this property. 

Property2
:   A short description of this property. This can be specified in `this specific format`.

% Add preconfigured settings for this connector type in [alerting-settings.md](https://github.com/elastic/kibana/edit/main/docs/reference/configuration-reference/alerting-settings.md) and an example in [pre-configured-connectors.md](https://github.com/elastic/kibana/edit/main/docs/reference/connectors-kibana/pre-configured-connectors.md).

## Test connectors [connector-name-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

% Describe what the test verifies, if it is specific to this connector type. Keep the action catalog out of this section.

## Connector actions [connector-name-connector-actions]

The {{CONNECTOR-NAME}} connector has the following actions:

% Mark the actions that write to or modify the third-party service.

Action1
:   A short description of this action and its parameters.

Action2
:   A short description of this action and its parameters. This can be specified in `this specific format`.

% Only for connectors that call an external service:

## Connector networking configuration [connector-name-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get credentials [connector-name-credentials]

% State the authentication mechanism (API key, OAuth 2.0, Basic, or PKI) in the prose, then describe how to obtain the credentials.
