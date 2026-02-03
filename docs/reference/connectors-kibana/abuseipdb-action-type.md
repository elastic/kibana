---
navigation_title: "AbuseIPDB"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/abuseipdb-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# AbuseIPDB connector [abuseipdb-action-type]

The AbuseIPDB connector communicates with the AbuseIPDB API to check IP reputation and report abusive IPs.

## Create connectors in {{kib}} [define-abuseipdb-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [abuseipdb-connector-configuration]

AbuseIPDB connectors have the following configuration properties:

API Key
:   The AbuseIPDB API key for authentication.

## Test connectors [abuseipdb-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The AbuseIPDB connector has the following actions:

Check IP
:   Get details about an IP address including abuse confidence score, usage type, ISP, and country code.  
    - **IP Address** (required): The IPv4 address to check.  
    - **Max Age in Days** (optional): Maximum age of reports in days (1-365, default 90).

Report IP
:   Report an abusive IP address to AbuseIPDB.  
    - **IP** (required): The IPv4 address to report.  
    - **Categories** (required): Array of abuse category IDs.  
    - **Comment** (optional): Additional details about the abuse.  

Get IP Info
:   Get detailed information about an IP address including geolocation and domain.  
    - **IP Address** (required): The IPv4 address to lookup.  

Bulk Check
:   Check multiple IPs in a network range using CIDR notation.  
    - **Network** (required): Network in CIDR notation.  
    - **Max Age in Days** (optional): Maximum age of reports in days (1-365, default 30).  

## Connector networking configuration [abuseipdb-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [abuseipdb-api-credentials]

To use the AbuseIPDB connector, you need an API key:

1. Go to [AbuseIPDB](https://www.abuseipdb.com/).
2. Sign up for an account or log in.
3. Navigate to your [API page](https://www.abuseipdb.com/api) in your account settings.
4. Generate an API key with appropriate permissions.
5. Copy the API key to configure the connector.
