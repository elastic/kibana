---
navigation_title: "GreyNoise"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/greynoise-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# GreyNoise connector [greynoise-action-type]

The GreyNoise connector communicates with the GreyNoise API to detect and classify Internet scanning noise.

## Create connectors in {{kib}} [define-greynoise-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [greynoise-connector-configuration]

GreyNoise connectors have the following configuration properties:

API Key
:   The GreyNoise API key for authentication.

## Test connectors [greynoise-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The GreyNoise connector has the following actions:

Get IP Context
:   Get detailed context and classification information about an IP address.  
    - **IP** (required): The IPv4 address to look up.  

Quick Lookup
:   Quickly check if an IP is classified as noise.  
    - **IP** (required): The IPv4 address to check.  

Get Metadata
:   Retrieve metadata about an IP address including geolocation and ASN.  
    - **IP** (required): The IPv4 address.  

RIOT Lookup
:   Check if an IP belongs to a known benign service (Rule It Out).  
    - **IP** (required): The IPv4 address.  

## Connector networking configuration [greynoise-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [greynoise-api-credentials]

To use the GreyNoise connector, you need an API key:

1. Go to [GreyNoise](https://www.greynoise.io/).
2. Sign up for an account or log in.
3. Navigate to your [Account Settings](https://viz.greynoise.io/account).
4. Find your API Key in the API section.
5. Copy the API key to configure the connector.
