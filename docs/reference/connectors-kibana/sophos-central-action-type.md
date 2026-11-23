---
navigation_title: "Sophos Central"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/sophos-central-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# Sophos Central connector [sophos-central-action-type]

The Sophos Central connector communicates with Sophos Central via REST API. It supports alert lifecycle management, endpoint isolation and scanning, IOC block and allow list management, tamper protection control, and XDR detection queries.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Create connectors in {{kib}} [define-sophos-central-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sophos-central-connector-configuration]

Sophos Central connectors have the following configuration properties:

API URL
:   The Sophos Central global API base URL. Defaults to `https://api.central.sophos.com`. The connector discovers your tenant ID and regional host automatically via the whoami endpoint. Use the default unless Sophos Support instructs otherwise. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

Authentication
:   Uses **OAuth 2.0 Client Credentials**. Provide the Client ID and Client Secret from Sophos Central (My Products > General Settings > API Credentials > Add Credential). The credential needs `alerts:read`, `alerts:action`, `endpoint-state:read`, `endpoint-state:update`, and `detections.queries.detections:create` scopes.

### Get API credentials [sophos-central-api-credentials]

1. Sign in to [Sophos Central Admin](https://central.sophos.com).
2. Navigate to **My Products > General Settings > API Credentials Management**.
3. Click **Add Credential** and assign a name.
4. Copy the **Client ID** and **Client Secret**.
5. Configure the credential with the required scopes.

## Test connectors [sophos-central-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by calling the Sophos Central whoami endpoint and confirming the tenant ID and regional data center.

## Connector actions [sophos-central-connector-actions]

The Sophos Central connector exposes the following actions:

`listAlerts`
:   List Sophos Central tenant alerts with optional filters for severity, product, category, and date range. Returns a cursor-paginated list. Pass `pageFromKey` from `pages.nextKey` to retrieve subsequent pages.

`getAlert`
:   Retrieve a single Sophos Central alert by UUID. Returns severity, category, managed agent (the affected endpoint), and allowed actions.

`actOnAlert`
:   Apply a lifecycle action to a single alert. Check the alert's `allowedActions` field first (from `getAlert`) to confirm the action is available. Available actions: `acknowledge`, `cleanPua`, `cleanVirus`, `authPua`, `clearThreat`, `clearHmpa`, `sendMsgPua`, `sendMsgThreat`.

`actOnAlertsBulk`
:   Apply a single lifecycle action to multiple alerts. The connector iterates over each alert ID in turn. Partial failures are returned alongside successes. Rate limit: 100 calls/min.

`listEndpoints`
:   List Sophos Central endpoints with optional filters for health status, isolation state, and tamper protection. Returns a cursor-paginated list. Pass `pageFromKey` from `pages.nextKey` to retrieve subsequent pages.

`getEndpoint`
:   Retrieve a single endpoint by UUID. Returns type, hostname, health status, network isolation state, tamper protection state, and last-seen timestamp.

`isolateEndpoint`
:   Put one or more endpoints into network isolation. The endpoint retains connectivity to Sophos Central but is blocked from all other network traffic. Accepts 1 to 500 endpoint UUIDs.

`deisolateEndpoint`
:   Remove one or more endpoints from network isolation, restoring normal network connectivity. Accepts 1 to 500 endpoint UUIDs.

`scanEndpoint`
:   Trigger an on-demand malware scan on one or more endpoints. The scan runs asynchronously; the action returns a scan ID immediately. Accepts 1 to 500 endpoint UUIDs.

`getTamperProtection`
:   Read the tamper protection status and recovery password for an endpoint. A disabled state is a risk signal.

`updateTamperProtection` _(not yet available)_
:   Enable or disable tamper protection for an endpoint. Optionally regenerate the recovery password. Only use after analyst approval.

`listBlockedItems`
:   List the items on the tenant's global blocked list. Returns a page-numbered list. Increment `page` until `page > pages.total` to retrieve all pages.

`addBlockedItem`
:   Add a SHA-256 file hash to the tenant's global blocked list. If the hash is already blocked the action returns a soft success.

`addAllowedItem`
:   Add an item to the tenant's global allowed list. Supported types: `path`, `sha256`, `certificateSigner`, `posixPath`.

`deleteBlockedItem` _(not yet available)_
:   Remove a blocked item from the tenant's global blocked list by its item ID. Deletion is permanent.

`listDetections`
:   Query XDR detections (requires XDR licence). The connector submits the query, polls until it completes (up to 120 s), and returns a paginated page of results.
