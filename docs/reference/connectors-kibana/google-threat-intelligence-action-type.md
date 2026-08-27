---
navigation_title: "Google threat intelligence"
type: reference
description: "Use the Google threat intelligence connector to retrieve file sandbox behavior reports and MITRE ATT&CK technique mappings from Google Threat Intelligence."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google threat intelligence connector [google-threat-intelligence-action-type]

The Google threat intelligence connector communicates with the [Google Threat Intelligence (GTI) API](https://gtidocs.virustotal.com/reference/api-overview) to retrieve file sandbox behavior reports and MITRE ATT&CK technique mappings for a file hash.

## Create connectors in {{kib}} [define-google-threat-intelligence-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [google-threat-intelligence-connector-configuration]

Google threat intelligence connectors have the following configuration properties:

API Key
:   The Google Threat Intelligence API key for authentication. The key must belong to an account with the GTI Enterprise subscription tier; a key without that entitlement fails the connector's **Test connector** check.

## Test connectors [google-threat-intelligence-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## Connector actions [google-threat-intelligence-connector-actions]

The Google threat intelligence connector has the following actions:

Get File Behaviours
:   Retrieve sandbox detonation reports for a file by hash. Each report covers one sandbox run: process tree, files, registry keys and network activity it touched, plus the verdict. Returns an empty collection when the hash is known to GTI but has not been sandboxed.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.
    - **Limit** (optional): Maximum number of behavior reports to retrieve. Minimum 0, maximum 40. Defaults to 10 if omitted.
    - **Cursor** (optional): Continuation cursor from a previous response, used to retrieve the next page of results.

Get File MITRE ATT&CK Techniques
:   Retrieve the MITRE ATT&CK tactics and techniques observed for a file by hash, grouped by the sandbox that observed them. Each technique lists the signatures that triggered it and their severity.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.

Both actions throw an error when GTI has no record of the hash at all, rather than returning empty data, so a genuinely unknown hash can be distinguished from a known hash with no sandbox activity.

## Connector networking configuration [google-threat-intelligence-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings.

## Get API credentials [google-threat-intelligence-api-credentials]

To use the Google threat intelligence connector, you need a Google Threat Intelligence API key from an account with the GTI Enterprise subscription tier. Refer to the [Google Threat Intelligence API documentation](https://gtidocs.virustotal.com/reference/api-overview) for details on obtaining a key, then paste it into the **API Key** field when configuring the connector.
