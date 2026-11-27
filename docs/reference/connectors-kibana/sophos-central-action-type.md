---
navigation_title: "Sophos Central"
type: reference
description: "Manage Sophos Central alerts, isolate and scan endpoints, maintain IOC block and allow lists, control tamper protection, and query XDR detections with the Sophos Central REST API connector."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Sophos Central connector [sophos-central-action-type]

The Sophos Central connector connects {{kib}} to Sophos Central. Use it to manage alerts, isolate and scan endpoints, maintain IOC block and allow lists, control tamper protection, and query XDR detections.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(API only)_ aren't available to agents yet. You can run them with the Run a connector API.
::::

## Create connectors in {{kib}} [define-sophos-central-ui]

You can create connectors in **{{stack-manage-app}} → {{connectors-ui}}**.

### Get API credentials [sophos-central-api-credentials]

The credential is created by a Sophos Central **Super Admin**. No scope or role selection is required during creation. The resulting credential inherits full API access from the creating admin's role.

1. Sign in to [Sophos Central Admin](https://central.sophos.com).
2. Go to **My Products → General Settings → API Credentials Management**, or **Global Settings → API Credentials** in some console versions.
3. Select **Add Credential**, enter a name, and select **Add**.
4. Copy the **Client ID** and **Client Secret**.

### Connector configuration [sophos-central-connector-configuration]

Sophos Central connectors have the following configuration properties:

Authentication
:   Uses **OAuth 2.0 Client Credentials**. Provide the Client ID and Client Secret obtained from **My Products → General Settings → API Credentials Management** in Sophos Central. The credential must be created by a Super Admin and must be a tenant-level credential. Partner or organization credentials are rejected.

**Connector networking configuration**

If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, add all three Sophos hosts: `id.sophos.com` (OAuth token endpoint), `api.central.sophos.com` (global API / whoami), and the regional data-center host returned by whoami (for example `api-us03.central.sophos.com`).

### Test connectors [sophos-central-connector-test]

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
:   Apply a single lifecycle action to multiple alerts. The connector iterates over each alert ID in turn and returns, per alert, the lifecycle `status` (`requested`, `started`, or `completed`) and the optional outcome `result` (for example `success`, `notNeeded`, or `alreadyDone`) from Sophos. `result` is optional and may be absent on any row. Use `status` to identify pending actions, not the absence of `result`. A failed request produces `status: failed` with an `error` string instead of a `result`. `acceptedCount` is the number of HTTP 2xx responses; it does not mean every alert was remediated. A batch can have `failureCount: 0` while actions are still pending or completed without remediation (`status: completed`, `result: notNeeded`). `completed` with `result: success` means the requested action was carried out by Sophos; it does not mean the threat was eliminated. For example, `acknowledge` and `sendMsgThreat` can return both values without removing the threat. Partial failures are returned alongside successes; a non-zero `failureCount` does not throw. Rate limit: 100 calls/min.

`listEndpoints`
:   List Sophos Central endpoints with optional filters for health status, isolation state, and tamper protection. Returns a cursor-paginated list. Pass `pageFromKey` from `pages.nextKey` to retrieve subsequent pages.

`getEndpoint`
:   Retrieve a single endpoint by UUID. Returns type, hostname, health status, network isolation state, tamper protection state, and last-seen timestamp.

`isolateEndpoint`
:   Put one or more endpoints into network isolation. The endpoint retains connectivity to Sophos Central but is blocked from all other network traffic. Accepts 1 to 500 endpoint UUIDs.

`deisolateEndpoint` _(API only)_
:   Remove one or more endpoints from network isolation, restoring normal network connectivity. Accepts 1 to 500 endpoint UUIDs.

    An analyst must invoke this action directly via the Kibana connector execution API after confirming the threat is remediated. Use `POST /api/actions/connector/<id>/_execute` for the default space, or `POST /s/<space_id>/api/actions/connector/<id>/_execute` for a non-default space. Kibana does not prompt for or verify that approval. The caller is responsible for obtaining it before invoking the action.

`scanEndpoint`
:   Trigger an on-demand malware scan on one or more endpoints. The scan runs asynchronously. The response contains per-endpoint results: accepted endpoint IDs and any per-endpoint errors. There is no single scan identifier. Accepts 1 to 500 endpoint UUIDs.

`getTamperProtection`
:   Read the tamper protection status for an endpoint. Returns only the `enabled` flag, and never the tamper protection passwords. A disabled state is a risk signal.

`updateTamperProtection` _(API only)_
:   Enable or disable tamper protection for an endpoint. Optionally regenerate the recovery password. Only use after analyst approval.

`listBlockedItems`
:   List the items on the tenant's global blocked list. Returns a page-numbered list. Increment `page` until `page > pages.total` to retrieve all pages.

`addBlockedItem`
:   Add a SHA-256 file hash to the tenant's global blocked list. A comment is required. If the hash is already blocked the action returns a soft success.

`addAllowedItem` _(API only)_
:   Add an item to the tenant's global allowed list. Supported types: `path`, `sha256`, `certificateSigner`, `posixPath`. A comment is required. Only use after analyst approval; adding an allowed item relaxes protection across the tenant.

`deleteBlockedItem` _(API only)_
:   Remove a blocked item from the tenant's global blocked list by its item ID. Deletion is permanent.

`listDetections`
:   Query XDR detections (requires XDR license). On the first call the connector submits the query via `POST /detections/v1/queries/detections`, polls until it completes (up to 90 seconds), and returns the first page of results along with `runId`. If the 90-second poll budget expires before the run completes, the connector returns `{ runId, state: "pending" }` instead of results. Pass that `runId` back to resume polling and retrieve results once the run finishes. To fetch subsequent pages, pass the same `runId` with the desired `page` number and the same `pageSize` used on the first call. The connector checks the run is complete before fetching results. Using a different `pageSize` on a continuation call changes the server's page boundaries and may cause rows to be skipped or duplicated.
