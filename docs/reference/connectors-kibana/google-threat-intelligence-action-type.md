---
navigation_title: "Google threat intelligence"
type: reference
description: "Use the Google threat intelligence connector to search threat collections and IOC streams, enrich IP, domain, URL, and file indicators, and submit URLs for public or private scanning."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google threat intelligence connector [google-threat-intelligence-action-type]

The Google threat intelligence connector communicates with the [Google Threat Intelligence (GTI) API](https://gtidocs.virustotal.com/reference/api-overview) to investigate threat actors, campaigns, malware, vulnerabilities, reports, and related indicators, to enrich IP addresses, domain names, URLs, and file hashes, and to submit URLs for public or private scanning. It can be used with Agent Builder and Workflows.

Use the [VirusTotal connector](/reference/connectors-kibana/virustotal-action-type.md) if you only need community file, URL, domain, and IP address scanning. Use this connector for GTI Enterprise data: threat-landscape collections, ATT&CK mappings, the IOC stream, and private URL scanning.

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

### Threat landscape [google-threat-intelligence-threat-landscape-actions]

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

### IOC reputation and relationships [google-threat-intelligence-ioc-actions]

Get IP Report
:   Get the GTI reputation and detection report for an IPv4 or IPv6 address, including the GTI assessment, last analysis statistics, network ownership and geolocation where available, and WHOIS data.
    - **IP address** (required): IPv4 or IPv6 address to look up.

Get IP Relationship
:   Get objects related to an IPv4 or IPv6 address, such as communicating files, hosted URLs, or historical DNS resolutions. Refer to the [IP address object relationships](https://gtidocs.virustotal.com/reference/ip-object#relationships) reference for the relationship types GTI currently publishes.
    - **IP address** (required): IPv4 or IPv6 address to look up.
    - **Relationship** (required): A relationship type published for IP address objects (for example `communicating_files`, `resolutions`, `urls`).
    - **Limit** (optional): Maximum number of related objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.

Get Domain Report
:   Get the GTI reputation and detection report for a domain name, including the GTI assessment, last analysis statistics, categorization, and WHOIS data.
    - **Domain** (required): Domain name to look up.

Get Domain Relationship
:   Get objects related to a domain name, such as DNS resolutions, subdomains, or communicating files. Refer to the [domain object relationships](https://gtidocs.virustotal.com/reference/domains-object#relationships) reference for the relationship types GTI currently publishes.
    - **Domain** (required): Domain name to look up.
    - **Relationship** (required): A relationship type published for domain objects (for example `resolutions`, `subdomains`, `communicating_files`).
    - **Limit** (optional): Maximum number of related objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.

Get URL Report
:   Get the GTI reputation and detection report for a URL, including the GTI assessment, last analysis statistics, categorization, and the final resolved destination after any redirects. Supply the URL in its natural form; the action derives the identifier GTI uses internally.
    - **URL** (required): URL to look up.

Get URL Relationship
:   Get objects related to a URL, such as downloaded files, contacted domains and IP addresses, or redirect targets. Refer to the [URL object relationships](https://gtidocs.virustotal.com/reference/url-object#relationships) reference for the relationship types GTI currently publishes.
    - **URL** (required): URL to look up, in its natural form, the same as for Get URL Report.
    - **Relationship** (required): A relationship type published for URL objects (for example `downloaded_files`, `contacted_domains`, `redirects_to`).
    - **Limit** (optional): Maximum number of related objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.

Get File Report
:   Get the GTI reputation and detection report for a file by hash, including the GTI assessment, last analysis statistics, file type metadata, and popular threat classification. This is a different action from Get File Behaviours, which returns sandbox detonation reports rather than the reputation report.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.

Get File Relationship
:   Get objects related to a file by hash, such as domains and IP addresses contacted during detonation, dropped files, or similar files. Refer to the [file object relationships](https://gtidocs.virustotal.com/reference/file-object#relationships) reference for the relationship types GTI currently publishes.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.
    - **Relationship** (required): A relationship type published for file objects (for example `contacted_domains`, `dropped_files`, `similar_files`).
    - **Limit** (optional): Maximum number of related objects to retrieve. Minimum 0, maximum 40. Defaults to 10.
    - **Cursor** (optional): Continuation cursor from a previous response.

### File sandbox activity [google-threat-intelligence-file-sandbox-actions]

Get File Behaviours
:   Get sandbox detonation reports for a file by hash. Each report covers one sandbox run: the process tree, files, registry keys, and network activity it touched, plus the verdict.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.
    - **Limit** (optional): Maximum number of behavior reports to retrieve. Minimum 0, maximum 40. Defaults to 1 to reduce the response size.
    - **Cursor** (optional): Continuation cursor from a previous response.

Get File MITRE ATT&CK Techniques
:   Get the MITRE ATT&CK tactics and techniques observed for a file by hash, grouped by the sandbox that observed them. Each technique lists the signatures that triggered it and their severity.
    - **File hash** (required): SHA-256, SHA-1, or MD5 hash identifying the file.

### URL scanning [google-threat-intelligence-url-scanning-actions]

Scan URL
:   Submit a URL to GTI for a fresh public analysis. Returns an analysis identifier; poll Get Analysis until it completes, then pass the URL identifier it reports to Get URL Scan Report.
    - **URL** (required): URL to submit for analysis, in its natural form, the same as for Get URL Report.

Get Analysis
:   Get the status and statistics of a public URL analysis submitted by Scan URL. The response also carries the URL identifier needed by Get URL Scan Report once the analysis completes.
    - **Analysis ID** (required): Analysis identifier returned by Scan URL.

Get URL Scan Report
:   Get the GTI reputation and detection report for a URL submitted through Scan URL, using the URL identifier from Get Analysis rather than the URL itself. Wraps the same endpoint as Get URL Report, kept separate because its input is an identifier rather than a URL to derive one from.
    - **URL ID** (required): URL identifier taken from the `meta.url_info.id` field of the Get Analysis response. Not derived by this action.

Scan Private URL
:   Submit a URL to GTI for a private analysis, sharing neither the URL nor the resulting analysis with the wider GTI community. Returns an analysis identifier; poll Get Private Analysis until it completes, then pass the URL identifier it reports to Get Private URL Report.
    - **URL** (required): URL to submit for private analysis.
    - **User agent** (optional): User-Agent string to present when retrieving the URL.
    - **Sandboxes** (optional): Comma separated list of sandboxes to detonate in, for example `chrome_headless_linux`, `cape_win`, or `zenbox_windows`.
    - **Retention period days** (optional): Number of days the analysis is retained. Minimum 1, maximum 28. Defaults to 1.
    - **Storage region** (optional): Region in which the analysis is stored, for example `US`, `CA`, `EU`, or `GB`.
    - **Interaction sandbox** (optional): Sandbox used for interactive analysis, for example `cape_win`. Defaults to `cape_win`.
    - **Interaction timeout** (optional): Interactive analysis duration in seconds. Minimum 60, maximum 1800. Defaults to 60.

Get Private Analysis
:   Get the status and statistics of a private URL analysis submitted by Scan Private URL. The response also carries the URL identifier needed by Get Private URL Report once the analysis completes.
    - **Analysis ID** (required): Analysis identifier returned by Scan Private URL.

Get Private URL Report
:   Get the GTI reputation and detection report for a URL submitted through Scan Private URL, using the URL identifier from Get Private Analysis rather than the URL itself.
    - **URL ID** (required): URL identifier taken from the `meta.url_info.id` field of the Get Private Analysis response. Not derived by this action.

## Error behavior [google-threat-intelligence-error-behavior]

Actions return GTI API errors when an object is unknown or the API key cannot access it. Which actions do that, and when, differs by identifier type.

Get File Behaviours, Get File MITRE ATT&CK Techniques, and Get File Report all throw an error when GTI has no record of the hash at all, rather than returning empty data, so a genuinely unknown hash can be distinguished from a known hash with no sandbox activity.

Get Domain Report and Get URL Report throw the same way, for a domain or URL GTI has no record of at all.

Get IP Report is the exception: it succeeds for any well-formed IP address, including private, reserved, and IPv6 addresses with no real internet presence.

Get IP Relationship, Get Domain Relationship, Get URL Relationship, Get File Relationship, and Get Related Objects all throw when the relationship type is not one GTI currently recognizes for that object type.

Get Collection, Get Analysis, Get URL Scan Report, Get Private Analysis, and Get Private URL Report throw when the object, analysis, or URL identifier is not one GTI recognizes.

Scanning a URL, public or private, is asynchronous: submit it with Scan URL or Scan Private URL, then re-invoke Get Analysis or Get Private Analysis at an interval until its status is completed, before calling Get URL Scan Report or Get Private URL Report. The connector does not poll on its own; the calling workflow or agent is responsible for the retry loop.

## Connector networking configuration [google-threat-intelligence-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as allowed hosts, proxies, certificates, or TLS settings. If you set an alternate API base URL, its host must be allowed by `xpack.actions.allowedHosts`.

## Get API credentials [google-threat-intelligence-api-credentials]

To use the Google threat intelligence connector, you need a Google Threat Intelligence API key from an account with the GTI Enterprise subscription tier. Refer to the [Google Threat Intelligence API documentation](https://gtidocs.virustotal.com/reference/api-overview) for details on obtaining a key, then paste it into the **API Key** field when configuring the connector.
