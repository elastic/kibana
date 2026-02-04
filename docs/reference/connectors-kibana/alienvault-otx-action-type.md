---
navigation_title: "AlienVault OTX"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/alienvault-otx-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# AlienVault OTX connector [alienvault-otx-action-type]

The AlienVault OTX (Open Threat Exchange) connector communicates with the AlienVault OTX API to retrieve community-driven threat intelligence.

## Create connectors in {{kib}} [define-alienvault-otx-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [alienvault-otx-connector-configuration]

AlienVault OTX connectors have the following configuration properties:

API Key
:   The AlienVault OTX API key for authentication.

## Test connectors [alienvault-otx-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The AlienVault OTX connector has the following actions:

Get Indicator
:   Retrieve information about a specific indicator (IP, domain, hash, URL).  
    - **Indicator Type** (required): Type of indicator (IPv4, IPv6, domain, hostname, url, FileHash-MD5, FileHash-SHA1, FileHash-SHA256).  
    - **Indicator** (required): The indicator value to look up.  
    - **Section** (optional): Specific section to retrieve.

Search Pulses
:   Search for threat pulses (threat intelligence reports).  
    - **Query** (optional): Search query string.  
    - **Page** (optional): Page number (default 1).  
    - **Limit** (optional): Results per page (1-100, default 20).

Get Pulse
:   Retrieve detailed information about a specific pulse by ID.  
    - **Pulse ID** (required): The pulse identifier.  

Get Related Pulses
:   Find pulses related to a specific indicator.  
    - **Indicator Type** (required): Type of indicator (IPv4, IPv6, domain, hostname, url, FileHash-MD5, FileHash-SHA1, FileHash-SHA256).  
    - **Indicator** (required): The indicator value.  

## Connector networking configuration [alienvault-otx-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [alienvault-otx-api-credentials]

To use the AlienVault OTX connector, you need an API key:

1. Go to [AlienVault OTX](https://otx.alienvault.com/).
2. Sign up for an account or log in.
3. Navigate to your account settings.
4. Find your OTX API Key in the API Integration section.
5. Copy the API key to configure the connector.
