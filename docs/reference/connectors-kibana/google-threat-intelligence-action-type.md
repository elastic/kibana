---
navigation_title: "Google threat intelligence"
type: reference
description: "Use the Google threat intelligence connector to search threat collections, related objects, IOC streams, and file ATT&CK intelligence."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google threat intelligence connector [google-threat-intelligence-action-type]

The Google threat intelligence connector communicates with the [Google Threat Intelligence (GTI) API](https://gtidocs.virustotal.com/reference/api-overview) to investigate threat actors, campaigns, malware, vulnerabilities, reports, related indicators, and file ATT&CK activity.

Use the [VirusTotal connector](/reference/connectors-kibana/virustotal-action-type.md) for general file, URL, domain, and IP address scanning. Use this connector for GTI Enterprise threat-landscape data and ATT&CK mappings.

## Create connectors in {{kib}} [define-google-threat-intelligence-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [google-threat-intelligence-connector-configuration]

Google threat intelligence connectors have the following configuration properties:

API Key
:   The Google Threat Intelligence API key for authentication. The key must belong to an account with the GTI Enterprise subscription tier; a key without that entitlement fails the connector's **Test connector** check.

API base URL
:   The GTI API origin. If you leave this field empty, the connector uses `https://www.virustotal.com`. Change it only when you use a compatible GTI API proxy.

## Test connectors [google-threat-intelligence-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## Connector actions [google-threat-intelligence-connector-actions]

The Google threat intelligence connector has the following actions:

Search Collections
:   Search and filter threat actors, campaigns, malware families, toolkits, vulnerabilities, reports, IOC collections, country profiles, and industry profiles.
    - **Filter** (optional): GTI filter expression. You can combine field modifiers with `AND`, `OR`, and `NOT`.
    - **Order** (optional): Sort expression, such as `last_modification_date-` or `relevance-`.
    - **Limit** (optional): Maximum number of objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.

Get Collection
:   Get a full GTI threat object by ID.
    - **ID** (required): Object ID returned by **Search Collections**.

Get Related Objects
:   Get objects in a named relationship of a GTI collection.
    - **ID** (required): Object ID returned by **Search Collections**.
    - **Relationship** (required): Relationship supported by the object type, such as `files` or `associations`.
    - **Limit** (optional): Maximum number of related objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.

Search Collection IOCs
:   Search IOCs associated with a threat actor, campaign, malware family, toolkit, report, vulnerability, or IOC collection.
    - **ID** (required): Object ID returned by **Search Collections**.
    - **Query** (required): GTI intelligence query. The search returns files by default. Use `entity:domain`, `entity:ip`, or `entity:url` to select another IOC type.
    - **Order** (optional): Sort expression supported by the selected IOC type.
    - **Limit** (optional): Maximum number of IOCs to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.
    - **Attributes** (optional): Comma-separated IOC attributes to return.
    - **Relationships** (optional): Comma-separated IOC relationship descriptors to return.

Get IOC Stream
:   Get recent files, URLs, domains, and IP addresses from the GTI IOC stream. Notifications are retained for 30 days.
    - **Filter** (optional): Filter by date, origin, entity, source, or notification tag.
    - **Order** (optional): `date-` for newest first or `date+` for oldest first.
    - **Limit** (optional): Maximum number of objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.
    - **Descriptors only** (optional): Return compact object descriptors instead of full objects.

Advanced Search
:   Search the GTI corpus for files, URLs, domains, or IP addresses.
    - **Query** (required): GTI intelligence query.
    - **Order** (optional): Sort expression supported by the selected object type.
    - **Limit** (optional): Maximum number of results to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.
    - **Descriptors only** (optional): Return compact object descriptors instead of full objects.

Get Report MITRE ATT&CK Techniques
:   Get MITRE ATT&CK tactics and techniques associated with a GTI report.
    - **Report ID** (required): GTI report ID returned by **Search Collections**.
    - **MITRE namespace** (optional): `enterprise`, `mobile`, or `ics`. Defaults to `enterprise`.
    - **TTP source** (optional): `operational`, `seen_in_iocs`, or `all`. Defaults to `all`.

Get File MITRE ATT&CK Techniques
:   Retrieve the MITRE ATT&CK tactics and techniques observed for a file by hash, grouped by the sandbox that observed them. Each technique lists the signatures that triggered it and their severity.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.

Actions return GTI API errors when an object is unknown or the API key cannot access it.

## Connector networking configuration [google-threat-intelligence-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as allowed hosts, proxies, certificates, or TLS settings. If you set an alternate API base URL, its host must be allowed by `xpack.actions.allowedHosts`.

## Get API credentials [google-threat-intelligence-api-credentials]

To use the Google threat intelligence connector, you need a Google Threat Intelligence API key from an account with the GTI Enterprise subscription tier. Refer to the [Google Threat Intelligence API documentation](https://gtidocs.virustotal.com/reference/api-overview) for details on obtaining a key, then paste it into the **API Key** field when configuring the connector.
