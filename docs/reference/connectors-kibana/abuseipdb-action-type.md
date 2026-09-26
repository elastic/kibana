---
navigation_title: "AbuseIPDB"
applies_to:
  stack: preview 9.3
  serverless: preview
---

# AbuseIPDB connector [abuseipdb-action-type]

The AbuseIPDB connector communicates with the AbuseIPDB API to check IP reputation and report abusive IPs.

This connector type is loaded from the connector catalog. It is absent unless `xpack.actions.catalog.enabled` is `true`. When enabled, Kibana fetches the catalog from `xpack.actions.catalog.url` (default `https://workflows.elastic.co/connectors/v1`) and refreshes it every `xpack.actions.catalog.refreshInterval` (default `5m`, minimum `10s`). Air-gapped deployments can set `xpack.actions.catalog.localBundlePath` instead of `url`. Connector spec versions use the `MAJOR.MINOR` form. The edit flyout shows an update-available notice when a newer version is in the catalog. The catalog definition is a technical preview and requires a gold license.

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
:   Get details about an IP address including abuse confidence score and total reports. Unknown or clean addresses return score `0` as data (the step does not fail).  
    - **IP Address** (required): IPv4 address to check.  
    - **Max Age in Days** (optional): Maximum age of reports in days (1-365, default 90).

Report IP
:   Report an IP address to AbuseIPDB.  
    - **IP** (required): IPv4 address to report.  
    - **Categories** (required): Array of abuse category IDs.  
    - **Comment** (optional): Additional details about the observed activity (max 1024 characters).

## Connector networking configuration [abuseipdb-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [abuseipdb-api-credentials]

To use the AbuseIPDB connector, you need an API key:

1. Go to [AbuseIPDB](https://www.abuseipdb.com/).
2. Sign up for an account or log in.
3. Navigate to your [API page](https://www.abuseipdb.com/api) in your account settings.
4. Generate an API key with appropriate permissions.
5. Copy the API key to configure the connector.
