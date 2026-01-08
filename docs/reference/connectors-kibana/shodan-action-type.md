---
navigation_title: "Shodan"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/shodan-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# Shodan connector [shodan-action-type]

The Shodan connector communicates with the Shodan API for Internet-wide asset discovery and vulnerability scanning.

## Create connectors in {{kib}} [define-shodan-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [shodan-connector-configuration]

Shodan connectors have the following configuration properties:

API Key
:   The Shodan API key for authentication.

## Test connectors [shodan-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Shodan connector has the following actions:

Search Hosts
:   Search for hosts and services using Shodan's search engine.  
    - **Query** (required): Search query string.  
    - **Page** (optional): Page number (default 1).

Get Host Info
:   Retrieve detailed information about a specific IP address.  
    - **IP** (required): The IPv4 address to look up.  

Count Results
:   Get the count of results for a search query without retrieving the actual results.  
    - **Query** (required): Search query string.  
    - **Facets** (optional): Facets to include in the results.  

Get Services
:   Retrieve the list of services that Shodan crawls.

## Connector networking configuration [shodan-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [shodan-api-credentials]

To use the Shodan connector, you need an API key:

1. Go to [Shodan](https://www.shodan.io/).
2. Sign up for an account or log in.
3. Navigate to your [Account page](https://account.shodan.io/).
4. Find your API Key in the account overview.
5. Copy the API key to configure the connector.

Note: Some features require a paid Shodan membership for full access.
