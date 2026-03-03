---
navigation_title: <CONNECTOR_NAME>
applies_to:
  stack: ga
  serverless: ga
description: Instructions and best practices for creating <CONNECTOR_NAME> in Elastic.
---

% For each new connector, also update the connector TOC at https://github.com/elastic/kibana/blob/main/docs/reference/toc.yml and the list of available connectors at https://github.com/elastic/kibana/blob/main/docs/reference/connectors-kibana.md

# {{CONNECTOR_NAME}} connector and action [connector-name-action-type]

Include a short description of the connector type.

## Create connectors in {{kib}} [define-connector-name-type]

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

The {{CONNECTOR-NAME}} actions have the following configuration properties.

Property1
:   A short description of this property.

Property2
:   A short description of this property with format hints. This can be specified in `this specific format`.


% Provide additional configuration details here. 

% ## Connector networking configuration [connector-name-connector-networking-configuration]