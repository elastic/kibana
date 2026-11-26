---
navigation_title: "Sophos Central"
type: reference
description: "Manage Sophos Central alerts, isolate and scan endpoints, maintain IOC block and allow lists, control tamper protection, and query XDR detections with the Sophos Central REST API connector."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Sophos Central connector [sophos-central-action-type]

Use the Sophos Central connector to manage alerts, isolate and scan endpoints, maintain IOC block and allow lists, control tamper protection, and query XDR detections in Sophos Central.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Create connectors in {{kib}} [define-sophos-central-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sophos-central-connector-configuration]

Sophos Central connectors have the following configuration properties:

Authentication
:   Uses **OAuth 2.0 Client Credentials**. Provide the Client ID and Client Secret from Sophos Central (**My Products → General Settings → API Credentials → Add Credential**). Only tenant-level credentials are supported — partner or organization credentials are rejected. The credential needs `alerts:read`, `alerts:action`, `endpoint-state:read`, `endpoint-state:update`, and `detections.queries.detections:create` scopes. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure all three hosts are added to the allowed hosts: `id.sophos.com` (OAuth token endpoint), `api.central.sophos.com` (global API / whoami), and the regional data-center host returned by whoami (for example `api-us03.central.sophos.com`).

### Get API credentials [sophos-central-api-credentials]

1. Sign in to [Sophos Central Admin](https://central.sophos.com).
2. Go to **My Products → General Settings → API Credentials Management**.
3. Select **Add Credential** and assign a name.
4. Copy the **Client ID** and **Client Secret**.

## Test connectors [sophos-central-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by calling the Sophos Central whoami endpoint and confirming the tenant ID and regional data center.

## Connector actions [sophos-central-connector-actions]

The Sophos Central connector exposes the following actions:

`listAlerts`
:   List Sophos Central tenant alerts with optional filters for severity, product, category, and date range. Returns a cursor-paginated list. Pass `pageFromKey` from `pages.nextKey` to retrieve subsequent pages.

`getAlert`
:   Retrieve a single Sophos Central alert by UUID. Returns severity, category, managed agent (the affected endpoint), and allowed actions.

`actOnAlert`
:   Apply a lifecycle action to a single alert. Check the alert's `allowedActions` field first (from `getAlert`) to confirm the action is available. Available actions: `acknowledge`, `cleanPua`, `cleanVirus`, `clearThreat`, `clearHmpa`, `sendMsgPua`, `sendMsgThreat`. The `authPua` action is excluded because it authorizes a potentially unwanted application, which relaxes tenant protection.

`actOnAlertsBulk`
:   Apply a single lifecycle action to multiple alerts. The connector iterates over each alert ID in turn. Partial failures are returned alongside successes. Rate limit: 100 calls/min.

`listEndpoints`
:   List Sophos Central endpoints with optional filters for health status, isolation state, and tamper protection. Returns a cursor-paginated list. Pass `pageFromKey` from `pages.nextKey` to retrieve subsequent pages.

`getEndpoint`
:   Retrieve a single endpoint by UUID. Returns type, hostname, health status, network isolation state, tamper protection state, and last-seen timestamp.

`isolateEndpoint`
:   Put one or more endpoints into network isolation. The endpoint retains connectivity to Sophos Central but is blocked from all other network traffic. Accepts 1 to 500 endpoint UUIDs.

`deisolateEndpoint` _(API only)_
:   Remove one or more endpoints from network isolation, restoring normal network connectivity. Accepts 1 to 500 endpoint UUIDs. Requires analyst confirmation before use.

`scanEndpoint`
:   Trigger an on-demand malware scan on one or more endpoints. The scan runs asynchronously; the action returns a scan ID immediately. Accepts 1 to 500 endpoint UUIDs.

`getTamperProtection`
:   Read the tamper protection status for an endpoint. Returns only the `enabled` flag — a disabled state is a risk signal. Passwords are never exposed.

`updateTamperProtection` _(API only)_
:   Enable or disable tamper protection for an endpoint. Optionally regenerate the recovery password. Only use after analyst approval.

`listBlockedItems`
:   List the items on the tenant's global blocked list. Returns a page-numbered list. Increment `page` until `page > pages.total` to retrieve all pages.

`addBlockedItem`
:   Add a SHA-256 file hash to the tenant's global blocked list. A comment is required. If the hash is already blocked the action returns a soft success.

`addAllowedItem` _(API only)_
:   Add an item to the tenant's global allowed list. Supported types: `path`, `sha256`, `certificateSigner`, `posixPath`. A comment is required. Only use after analyst approval — adding an allowed item relaxes protection across the tenant.

`deleteBlockedItem` _(API only)_
:   Remove a blocked item from the tenant's global blocked list by its item ID. Deletion is permanent.

`listDetections`
:   Query XDR detections (requires XDR license). On the first call the connector submits the query via `POST /detections/v1/queries/detections`, polls until it completes (up to 90 seconds), and returns the first page of results along with `runId`. To fetch subsequent pages, pass the same `runId` with the desired `page` number and the same `pageSize` used on the first call — the connector skips submission and returns results directly. Using a different `pageSize` on a continuation call changes the server's page boundaries and may cause rows to be skipped or duplicated.
