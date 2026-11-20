---
navigation_title: "Microsoft Defender XDR"
type: reference
description: "Use the Microsoft Defender XDR connector to manage incidents and alerts, run advanced hunting KQL queries, enrich threat intelligence, and triage threats in Microsoft Defender XDR."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Microsoft Defender XDR connector [microsoft-defender-xdr-action-type]

The Microsoft Defender XDR connector uses the [Microsoft Graph Security API](https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview) so agents can manage incidents and alerts, run advanced hunting KQL queries, audit custom detection rules, enrich threat intelligence, and report on secure score against Microsoft Defender XDR threat data.

This connector is currently available in **Agent Builder** only.

## Create connectors in {{kib}} [define-microsoft-defender-xdr-ui]

Create a Microsoft Defender XDR connector from the **{{connectors-ui}}** page. To open the page, find **{{connectors-ui}}** in the navigation or under **Alerts and Insights / Connectors** in the [global search bar](docs-content://explore-analyze/find-and-organize/find-apps-and-objects.md).

### Connector configuration [microsoft-defender-xdr-connector-configuration]

Cloud environment
:   Select the Microsoft cloud where your Defender XDR tenant is hosted:
    - **Commercial (global)** — public Microsoft 365 cloud (default)
    - **US Government GCC High** — Microsoft 365 Government GCC High cloud
    - **US Government DoD** — Microsoft 365 Government DoD cloud

Authentication: Client secret (OAuth 2.0 Client Credentials)
:   Configure the following fields:

Token URL
:   The Microsoft Entra ID token endpoint for your tenant. Use the format `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`, replacing `{tenant-id}` with your directory (tenant) ID (GUID). For GCC High and DoD use `https://login.microsoftonline.us/{tenant-id}/oauth2/v2.0/token`.

Client ID
:   The Application (client) ID from your Microsoft Entra app registration.

Client Secret
:   A client secret created for the app registration under **Certificates & Secrets**.

Authentication: Certificate (OAuth 2.0 Private Key JWT)
:   As an alternative to a client secret, authenticate with an X.509 certificate. Upload the PEM-encoded public certificate and private key. The certificate must first be uploaded to your app registration under **Certificates & secrets > Certificates**.

## Available actions [microsoft-defender-xdr-available-actions]

The following actions are available for the Microsoft Defender XDR connector.

### Actions summary table [microsoft-defender-xdr-actions-table]

| Action | Category | Required parameters | Optional parameters | Required Graph permission |
|---|---|---|---|---|
| `listIncidents` | Incident management | — | `filter`, `top`, `skip`, `includeAlerts` | `SecurityIncident.ReadWrite.All` |
| `getIncident` | Incident management | `incidentId` | — | `SecurityIncident.ReadWrite.All` |
| `updateIncident` | Incident management | `incidentId` + at least one field | `status`, `assignedTo`, `classification`, `determination`, `severity`, `customTags` | `SecurityIncident.ReadWrite.All` |
| `addIncidentComment` | Incident management | `incidentId`, `comment` | — | `SecurityIncident.ReadWrite.All` |
| `mergeIncidents` _(not yet available as an agent tool)_ | Incident management | `incidentIds` (≥ 2 IDs) | `comment` | `SecurityIncident.ReadWrite.All` |
| `listAlerts` | Alert management | — | `filter`, `top`, `skip` | `SecurityAlert.ReadWrite.All` |
| `getAlert` | Alert management | `alertId` | — | `SecurityAlert.ReadWrite.All` |
| `updateAlert` | Alert management | `alertId` + at least one field | `status`, `assignedTo`, `classification`, `determination` | `SecurityAlert.ReadWrite.All` |
| `addAlertComment` | Alert management | `alertId`, `comment` | — | `SecurityAlert.ReadWrite.All` |
| `runHuntingQuery` | Advanced hunting | `query` | `timespan` | `ThreatHunting.Read.All` |
| `listDetectionRules` | Custom detection rules | — | `top`, `skip` | `CustomDetection.Read.All` |
| `getDetectionRule` | Custom detection rules | `ruleId` | — | `CustomDetection.Read.All` |
| `createDetectionRule` _(not yet available as an agent tool)_ | Custom detection rules | `displayName`, `queryText`, `period`, `alertTemplate` | `isEnabled` | `CustomDetection.ReadWrite.All` |
| `updateDetectionRule` _(not yet available as an agent tool)_ | Custom detection rules | `ruleId` + at least one field | `displayName`, `isEnabled`, `queryText`, `period`, `alertTemplate` | `CustomDetection.ReadWrite.All` |
| `deleteDetectionRule` _(not yet available as an agent tool)_ | Custom detection rules | `ruleId` | — | `CustomDetection.ReadWrite.All` |
| `getThreatIntelHost` | Threat intelligence | `host` | — | `ThreatIntelligence.Read.All` |
| `getThreatIntelHostReputation` | Threat intelligence | `host` | — | `ThreatIntelligence.Read.All` |
| `getPassiveDnsRecords` | Threat intelligence | `host` | — | `ThreatIntelligence.Read.All` |
| `getWhoisRecord` | Threat intelligence | `host` | — | `ThreatIntelligence.Read.All` |
| `listSecureScores` | Secure score | — | `top` | `SecurityEvents.Read.All` |

### Incident management

`listIncidents`
:   Lists Defender XDR incidents with optional OData `$filter` expressions, pagination (`top`/`skip`), and optional expansion of related alerts. Use to get an overview of active threats or page through incident history.

`getIncident`
:   Retrieves full details for a single incident by its numeric ID, including all related alerts, evidence, and affected assets. Device evidence items include `mdeDeviceId` and `deviceDnsName`, which can be passed to the Microsoft Defender for Endpoint connector for containment or live-response actions.

`updateIncident`
:   Updates an incident — change `status` (`active`, `resolved`, `inProgress`, `redirected`), assign to an analyst (`assignedTo`), set `classification` and `determination`, adjust `severity`, or replace `customTags`. Only the fields you provide are changed. To add a comment, use `addIncidentComment` instead.

`addIncidentComment`
:   Appends a comment to an incident's activity log. Use to record analyst notes, investigation findings, or escalation decisions for audit trail purposes.

`mergeIncidents`
:   Merges two or more incidents into a single incident. The first incident ID in the `incidentIds` list becomes the primary (surviving) incident; all others are merged into it. Use to consolidate duplicate detections or combine related incidents from the same attack campaign. This action is irreversible — verify incident IDs with `listIncidents` or `getIncident` first.

### Alert management

`listAlerts`
:   Lists Defender XDR alerts (`alerts_v2`) across all Defender products (Endpoint, Office 365, Identity, Cloud Apps) with optional OData `$filter` expressions and pagination. Use to inspect an alert before it is rolled into an incident, or to triage alerts that may not warrant a full incident.

`getAlert`
:   Retrieves full details for a single alert, including evidence (affected devices, users, files, processes, and network connections). Device evidence includes `mdeDeviceId` for use with the Microsoft Defender for Endpoint connector.

`updateAlert`
:   Updates an alert independently of its parent incident — change `status` (`new`, `inProgress`, `resolved`), assign to an analyst (`assignedTo`), or set `classification` and `determination`. Alert severity cannot be changed via PATCH. Use for triage that does not warrant touching the full incident yet. Provide only the fields you want to change.

`addAlertComment`
:   Appends a comment to an alert's activity log. Use to record triage notes, analyst observations, or escalation decisions directly on the alert for audit trail purposes.

### Advanced hunting

`runHuntingQuery`
:   Runs a Kusto Query Language (KQL) advanced hunting query against Defender XDR tables such as `DeviceEvents`, `EmailEvents`, `AlertInfo`, `AlertEvidence`, `IdentityLogonEvents`, and `CloudAppEvents`. Results are capped at 100,000 rows; queries can access up to 30 days of data. Use the optional `timespan` parameter (ISO 8601 duration, e.g. `PT1H`, `P7D`) to scope the query time range.

### Custom detection rules

`listDetectionRules`
:   Lists configured custom hunting-based detection rules. Use to audit what rules are already generating alerts before creating a new one, or to retrieve rule IDs for update or delete operations.

`getDetectionRule`
:   Retrieves full details for a single custom detection rule by its numeric ID, including its KQL query, schedule, alert template, and trigger settings.

`createDetectionRule`
:   Creates a new custom detection rule that runs a KQL query on a schedule and generates alerts when the result count satisfies the trigger condition. The query must project at least one of: `DeviceId`, `AccountObjectId`, `AccountSid`, `AccountUpn`, `AccountName`, `MailboxAddress`, `FileName`, `SHA256`, `IPAddress`, `URL`. The `alertTemplate` object requires a `title` and `severity` and optionally accepts `description`, `recommendedActions`, and `mitreTechniques`. The `period` must be one of `PT1H`, `PT3H`, `PT12H`, `P1D`, or `P7D`.

`updateDetectionRule`
:   Updates an existing custom detection rule — modify `displayName`, enable/disable via `isEnabled`, change the KQL `queryText`, adjust the `period`, or update the `alertTemplate`. Provide only the fields you want to change.

`deleteDetectionRule`
:   Permanently deletes a custom detection rule by its numeric ID. Confirm the rule ID with `listDetectionRules` or `getDetectionRule` before deleting. This action is irreversible.

### Threat intelligence

`getThreatIntelHost`
:   Retrieves Microsoft Defender Threat Intelligence (MDTI) data for a hostname or IP address — including associated threat actors, malware families, infrastructure relationships, and first/last seen dates. The `host` parameter accepts FQDNs, IPv4 addresses, or IPv6 addresses.

`getThreatIntelHostReputation`
:   Returns the MDTI reputation score and classification for a hostname or IP address. The score ranges from 0–100 (higher = more malicious). Classification is one of `malicious`, `suspicious`, `neutral`, or `benign`, with the rules that influenced the score.

`getPassiveDnsRecords`
:   Retrieves forward passive DNS records for a hostname from MDTI — showing what IPs a domain resolved to. Use to pivot across attacker infrastructure during threat hunting or attribution investigations.

`getWhoisRecord`
:   Retrieves WHOIS registration data for a domain from MDTI. Returns registrar, registrant contact details, name servers, registration and expiry dates, and abuse contact. Use to attribute domains to known threat actors or identify recently registered infrastructure.

### Secure score

`listSecureScores`
:   Retrieves Microsoft Secure Score snapshots. Returns the organization's composite identity, device, and app security score with control-level breakdowns. Results are ordered by date descending so the most recent score is first. The `top` parameter controls how many snapshots to return (default 25, maximum 100).

## Device identifier handoff [microsoft-defender-xdr-device-handoff]

The `getAlert` response includes a top-level `evidence` array. The `getIncident` response (with `$expand=alerts`) nests evidence under each alert in `alerts[].evidence`. Items of type `#microsoft.graph.security.deviceEvidence` contain:

- `mdeDeviceId` — the Microsoft Defender for Endpoint machine ID
- `deviceDnsName` — the device hostname
- `azureAdDeviceId` — the Azure AD device object ID (when available)

Pass `mdeDeviceId` to the Microsoft Defender for Endpoint connector to trigger isolate, scan, or live-response actions.

## Get API credentials [microsoft-defender-xdr-api-credentials]

To use this connector, register an application in Microsoft Entra ID and grant it the required application permissions.

### Register an app in Microsoft Entra ID

1. Sign in to the [Azure Portal](https://portal.azure.com) and open **Microsoft Entra ID > App registrations**.
2. Select **New registration**. Enter a name (for example, `Kibana Defender XDR`), choose **Accounts in this organizational directory only**, and select **Register**.
3. Note the **Application (client) ID** and **Directory (tenant) ID** shown on the **Overview** page.

### Grant API permissions

1. In your app registration, go to **API permissions > Add a permission > Microsoft Graph > Application permissions**.
2. Add the following permissions:

   | Permission | Purpose |
   |---|---|
   | `SecurityIncident.ReadWrite.All` | Read, update, merge, and comment on incidents |
   | `SecurityAlert.ReadWrite.All` | Read, update, and comment on alerts |
   | `ThreatHunting.Read.All` | Run advanced hunting queries |
   | `CustomDetection.Read.All` | List and read custom detection rules |
   | `ThreatIntelligence.Read.All` | Threat intelligence enrichment (host details, reputation, passive DNS, WHOIS) |
   | `SecurityEvents.Read.All` | Read Microsoft Secure Score |

3. Select **Add permissions**, then **Grant admin consent** for your organization.

### Authenticate with a client secret

1. In your app registration, go to **Certificates & Secrets > Client secrets > New client secret**.
2. Set a description and expiry, then select **Add**.
3. Copy the **Value** immediately — it is not shown again after you leave the page.

### Authenticate with a certificate

1. Generate a self-signed or CA-issued X.509 certificate (PEM format).
2. In your app registration, go to **Certificates & Secrets > Certificates > Upload certificate** and upload the public certificate (`.pem` or `.crt`).
3. When configuring the connector, choose the **Certificate** authentication method and upload both the public certificate and the matching private key.

### Configure the connector

Enter the following in the Kibana connector form:

| Field | Value |
|---|---|
| **Cloud environment** | Commercial, GCC High, or DoD depending on your tenant |
| **Token URL** | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token` |
| **OAuth scope** | `https://graph.microsoft.com/.default` for Commercial, `https://graph.microsoft.us/.default` for GCC High, or `https://dod-graph.microsoft.us/.default` for DoD. Must match the selected cloud environment. |
| **Client ID** | The Application (client) ID from your app registration |
| **Client Secret** | The client secret value, or upload a certificate instead |
