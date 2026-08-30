---
navigation_title: "MISP"
type: reference
description: "Use the MISP connector to search attributes and events, check indicators and warninglists, and write sightings, events, attributes, and tags back to a self-hosted MISP instance."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# MISP connector [misp-action-type]

The MISP connector uses the [Malware Information Sharing Platform (MISP) automation API](https://www.circl.lu/doc/misp/automation/) so workflow authors and agents can enrich detections from a self-hosted MISP instance and write sightings, events, attributes, and tags back.

## Create connectors in {{kib}} [define-misp-ui]

Create an MISP connector from the **{{connectors-ui}}** page. To open the page, find **{{connectors-ui}}** in the navigation or under **Alerts and Insights / Connectors** in the [global search bar](docs-content://explore-analyze/find-and-organize/find-apps-and-objects.md).

### Connector configuration [misp-connector-configuration]

MISP URL
:   Base URL of your MISP instance, for example `https://misp.example.com` or `https://localhost`. Don't include a trailing slash or an `/attributes` path.

Authentication
:   Automation API key. {{kib}} sends the key as `Authorization: <key>`. Do not add a `Bearer` prefix. MISP rejects that form. Create the key from **Administration → List Auth Keys**.
:   For self-signed TLS (common on local Docker MISP), set verification mode to **none**. Use **full** when the instance presents a publicly trusted certificate. Optionally provide a Client Authentication Privacy Enhanced Mail (CA PEM) for private certificate authorities (CAs).

## Available actions [misp-available-actions]

| Action | Description |
|--------|-------------|
| `searchAttributes` | Search attributes by value, type, category, tags, or event. Parameters: `value`, `type`, `category`, `tags`, `eventId`, `limit` (default 10), `page` (default 1). |
| `searchEvents` | Search events by indicator, tags, info, or date range. Parameters: `value`, `tags`, `eventInfo`, `from`, `to`, `limit`, `page`. |
| `checkIndicator` | Reputation-style lookup for one IOC. Returns `verdict` (`unknown` \| `known` \| `malicious`) plus matches. Empty results mean unknown, not clean. Parameters: `value` (required), `type`. |
| `addSighting` | Record a sighting on an attribute by id/UUID or value. Parameters: `attributeId` or `value` (at least one required), `type` (0=sighting, 1=false-positive, 2=expiration; default 0), `source`. |
| `getEvent` | Fetch a full event by id or UUID. Parameters: `eventId` (required). |
| `checkWarninglist` | Check values against enabled warninglists. Parameters: `values` (required array). |
| `createEvent` | Create an event. Parameters: `info` (required), `distribution`, `threatLevelId`, `analysis`, `published` (default false). |
| `addAttribute` | Add an IOC to an event. Parameters: `eventId`, `type`, `value` (required), `category`, `toIds` (default true), `comment`. |
| `publishEvent` | Publish an event. Parameters: `eventId` (required). |
| `addTagToEvent` | Apply a tag to an event. Parameters: `eventId`, `tag` (required). |

## Connector networking configuration [misp-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [misp-api-credentials]

1. Sign in to your MISP instance as an administrator.
2. Open **Administration → List Auth Keys** (or **Sync Actions → List Auth Keys**, depending on version).
3. Create an automation key for a user that can search attributes and events. If you use write actions, grant that user permission to create events, attributes, tags, and sightings. The user also needs permission to publish events.
4. Copy the API key into the connector (no `Bearer` prefix).
5. If the instance uses a self-signed certificate, set verification mode to **none** (or supply the PEM CA).
