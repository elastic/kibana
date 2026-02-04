---
navigation_title: "VirusTotal"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/virustotal-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# VirusTotal connector [virustotal-action-type]

The VirusTotal connector communicates with the VirusTotal API for file scanning, URL analysis, and threat intelligence lookups.

## Create connectors in {{kib}} [define-virustotal-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [virustotal-connector-configuration]

VirusTotal connectors have the following configuration properties:

API Key
:   The VirusTotal API key for authentication.

## Test connectors [virustotal-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The VirusTotal connector has the following actions:

Scan File Hash
:   Look up a file hash (MD5, SHA-1, or SHA-256) to get scan results.  
    - **Hash** (required): File hash (minimum 32 characters).  

Scan URL
:   Submit a URL for analysis and get scan results.  
    - **URL** (required): URL to scan.  

Submit File
:   Submit a file for analysis.  
    - **File** (required): Base64-encoded file content.  
    - **Filename** (optional): Original filename.

Get IP Report
:   Get reputation and details about an IP address.  
    - **IP** (required): IPv4 address.  

## Connector networking configuration [virustotal-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [virustotal-api-credentials]

To use the VirusTotal connector, you need an API key:

1. Go to [VirusTotal](https://www.virustotal.com/).
2. Sign up for an account or log in.
3. Navigate to your [API Key page](https://www.virustotal.com/gui/user/apikey).
4. Copy your API key. For free accounts, you'll have rate limits. Consider upgrading to a premium account for higher limits.
5. Copy the API key to configure the connector.
