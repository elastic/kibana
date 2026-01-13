---
navigation_title: "URLVoid"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/urlvoid-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# URLVoid connector [urlvoid-action-type]

The URLVoid connector communicates with the URLVoid API to check domain and URL reputation using multi-engine scanning.

## Create connectors in {{kib}} [define-urlvoid-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [urlvoid-connector-configuration]

URLVoid connectors have the following configuration properties:

API Key
:   The URLVoid API key for authentication.

## Test connectors [urlvoid-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The URLVoid connector has the following actions:

Scan Domain
:   Scan a domain name for reputation and malicious activity.  
    - **Domain** (required): The domain name to scan.  

Check URL
:   Check a full URL for reputation and safety.  
    - **URL** (required): The URL to check.  

Get Domain Info
:   Retrieve detailed information about a domain including registrar and creation date.  
    - **Domain** (required): The domain name.  

Scan Domain Stats
:   Get API usage statistics including queries remaining and queries used.

## Connector networking configuration [urlvoid-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [urlvoid-api-credentials]

To use the URLVoid connector, you need an API key:

1. Go to [URLVoid](https://www.urlvoid.com/).
2. Sign up for an API account.
3. Choose an API plan that suits your needs.
4. After purchase, you'll receive your API key via email.
5. Copy the API key to configure the connector.
