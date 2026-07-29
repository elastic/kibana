---
navigation_title: "MCP"
type: reference
description: "Use the MCP connector to retrieve and call the tools that remote Model Context Protocol (MCP) servers provide."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/mcp-action-type.html
applies_to:
  stack: preview 9.3 
  serverless: preview
---

# MCP connector [mcp-action-type]
The Model Context Protocol (MCP) connector communicates with remote [MCP](https://modelcontextprotocol.io/docs/getting-started/intro) servers to retrieve and call their tools. This connector is required to use external MCP tools in [Elastic Agent Builder](docs-content://explore-analyze/ai-features/elastic-agent-builder.md).

## Create connectors in {{kib}} [define-mcp-ui]

You can create an MCP connector in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

:::{image} ../images/mcp-connector.png
:alt: MCP connector
:screenshot:
:::

### Connector configuration [mcp-connector-configuration]

MCP connectors have the following configuration properties:

Name
:   The name of the connector.

Server URL
:   The URL of the MCP server.

HTTP headers (under Additional settings)
:   A custom set of HTTP headers that you can use to connect to an MCP server.

    Config
    :   If you choose the config type, values in headers will be sent as plain text in requests.   

    Secret
    :   If you choose the secret type, values in your headers will be encrypted in requests. 

## Test connectors [mcp-action-configuration]

You can test connectors as you’re creating or editing the connector in {{kib}}. For example:

:::{image} ../images/mcp-test-connector.png
:alt: MCP test connector
:screenshot:
:::

## Connector actions [mcp-connector-actions]

MCP connectors offer three actions:

`test`
:   Test the connection to the remote MCP server with any auth that was provided.

`listTools`
:   Call the MCP server's `listTools` endpoint. Returns a list of tools and their input and output schemas.

`callTool`
:   Call a specific MCP server tool.

:::{tip}
Call `listTools` first to understand how to correctly call an MCP server's tools, before using the `callTool` action. 
:::

## Connector networking configuration [mcp-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
