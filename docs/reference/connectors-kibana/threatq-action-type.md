---
navigation_title: ThreatQ
type: reference
description: Search indicators, read threat context, record triage findings, and run operations with the ThreatQ connector. This reference covers authentication and action parameters.
applies_to:
  stack: preview 9.6
  serverless: preview
---

# ThreatQ connector

The ThreatQ connector searches and updates intelligence in a hosted or on-premises ThreatQ instance through its REST API. Use it in Workflows or Agent Builder to read indicator context, record investigation findings, and link objects. Workflows can also run configured ThreatQ operations.

## Before you begin

You need a ThreatQ account that supports OAuth password authentication. The account needs read access to the requested objects. Changes require write access, and plugin actions require permission to run the selected operation.

The instance must be reachable from {{kib}} over HTTPS. If you configure [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md), include the ThreatQ hostname. Use a certificate trusted by {{kib}}, or configure the instance certificate authority through the action settings.

## Create connectors in {{kib}}

Find **{{connectors-ui}}** in the navigation menu or use the global search field. Create a connector and select **ThreatQ**.

### Connector configuration

ThreatQ URL
:   HTTPS instance URL, for example `https://threatq.example.com`. An optional `/api` suffix is accepted. Do not include credentials, a query string, or a fragment.

OAuth client ID
:   The client ID from the instance's `/assets/js/config.js` file. Your ThreatQ administrator can supply this value.

Authentication
:   Select **ThreatQ account** and enter the account email and password. The account needs read access to the requested objects. Changes require write access, and plugin actions require permission to run the selected operation.

### Get API credentials

1. Ask your ThreatQ administrator for an account that supports OAuth password authentication.
2. Grant read access to the requested objects. Grant write access for changes and permission to run each selected plugin operation.
3. Get the OAuth client ID from the instance's `/assets/js/config.js` file.
4. Enter the instance URL, client ID, email, and password in the connector.

The connector exchanges the credentials for a temporary access token through `POST /api/token` for each action. Subsequent requests use that token. You do not need to copy or refresh access tokens manually.

## Test connectors

The connector test authenticates and requests one indicator type. A successful test confirms connectivity, authentication, and read access to indicator types. It does not verify write permissions or plugin configuration.

## Connector actions

Actions return the ThreatQ JSON response, including `data`, `total`, and cursor metadata when present. List and search actions return one page.

### Search and read intelligence

| Action | Required parameters | Optional parameters and behavior |
| --- | --- | --- |
| `searchIndicators` | None | `criteria`, `filters`, `limit`, `offset`, and `sort`. Uses `POST /api/indicators/query`. |
| `searchObjects` | `objectType` | `criteria`, `filters`, `limit`, `offset`, `sort`, and `cursorMark`. Uses `POST /api/{objectType}/query`. |
| `getIndicator` | `indicatorId` | `with` selects related fields. Defaults to attributes, sources, score, status, adversaries, and events. |
| `getObject` | `objectType`, `objectId` | `with` selects related fields for an adversary, event, report, or another supported object type. |
| `getRelatedObjects` | `objectType`, `objectId`, `relatedType` | `limit`, `offset`, `sort`, and `with`. Starting and related types are `indicators`, `events`, or `adversaries`. |
| `listIndicatorStatuses` | None | `limit`, `offset`, and `sort`. Returns the status names and IDs configured in the instance. |
| `listIndicatorTypes` | None | `limit`, `offset`, and `sort`. Returns indicator type names, IDs, and classes. |

`limit` defaults to `50` and accepts values from `1` to `500`. `offset` defaults to `0`. For another page, increase `offset` by `limit`. For cursor searches, start with `cursorMark: "*"` and then pass the returned `nextCursorMark`. Stop when the cursor does not change. When supplied, `cursorMark` replaces `offset`.

The `sort` parameter accepts comma-separated fields, such as `-created_at,id`. A minus sign reverses the sort order.

Search criteria and filters use ThreatQ's structured query format. The connector sends them in the request body and sends pagination fields in the query string. For example:

```json
{
  "criteria": {
    "value": { "+contains": "example.com" }
  },
  "filters": {
    "+and": [
      { "type_name": "FQDN" },
      { "status_name": "Active" },
      { "score": { "+gte": 6 } }
    ]
  },
  "limit": 50,
  "offset": 0
}
```

Each query object accepts at most 20,000 characters, 50 entries per object or array, and five nested collection levels beneath its keys. Individual strings accept at most 2,000 characters.

Pass `with` as an array of relationship names. The connector sends a comma-separated parameter. Relationship names depend on the object definitions and ThreatQ version. For example, an adversary can use `description`; some instances expose `descriptions`, `ttp`, and `attack_pattern`. Confirm the names supported by your instance. Report detail requests use the singular `report` endpoint. The API reference lists `reports` for searches; `searchObjects` accepts both names so you can use the endpoint supported by your instance.

### Record investigation findings

| Action | Required parameters | Optional parameters and behavior |
| --- | --- | --- |
| `createIndicator` | `value`, `typeId`, `statusId` | `sources`. Adds one indicator using the API's array request format. The response can identify an existing indicator. |
| `updateIndicatorStatus` | `indicatorId`, `statusId` | Updates only `status_id`. Resolve the target ID with `listIndicatorStatuses`. |
| `addAttribute` | `objectType`, `objectId`, `name`, `value` | `sources`. Adds an attribute to an indicator, event, or adversary. |
| `createEvent` | `title`, `type`, `happenedAt` | `sources`. Supply a configured event type and a UTC time in `YYYY-MM-DD HH:mm:ss` format. |
| `createAdversary` | `name` | `sources`. Returns the actor ID for subsequent relationships. |
| `linkObjects` | `objectType`, `objectId`, `relatedType`, `relatedId` | Links two existing indicators, events, or adversaries. |

IDs must be positive integers. Discover indicator type and status IDs in the target instance before creating or updating an indicator.

`sources` accepts up to 50 records. Each record requires `name` and accepts an optional `tlp` object and `published_at` timestamp. Use Traffic Light Protocol labels supported by the target version. For example:

```json
{
  "sources": [
    {
      "name": "Elastic Security",
      "tlp": { "name": "AMBER" },
      "published_at": "2026-09-16 10:00:00"
    }
  ]
}
```

### Run ThreatQ operations

| Action | Required parameters | Behavior |
| --- | --- | --- |
| `listPlugins` | None | Lists installed operations. Accepts `limit`, `offset`, and `sort`. |
| `getPlugin` | `pluginId` | Requests the `action` and `objectType` relationships. |
| `executePlugin` | `pluginId`, `type`, `objectId`, `action` | Runs the selected operation and returns its result. |

Use `listPlugins` and `getPlugin` to find the plugin ID, action name, and supported object type. The plugin must be configured and enabled in ThreatQ. The `type` parameter is case-sensitive, for example `Indicator`. An action name can be `whois`, depending on the installed plugin.

Plugin execution can change data or call external services. It is not exposed as an Agent Builder tool.

## API reference

Use the [ThreatQ REST API reference for your installed version](https://helpcenter.threatq.com/Developer_Resources/ThreatQ_REST_API.htm). The [ThreatQ SDK guide](https://helpcenter.threatq.com/Developer_Resources/SDK/ThreatQ_SDK_Guide.htm) includes examples for status updates and related objects.
