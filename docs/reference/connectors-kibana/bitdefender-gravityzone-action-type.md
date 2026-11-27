---
navigation_title: "Bitdefender GravityZone"
type: reference
description: "Use the Bitdefender GravityZone connector to search and isolate endpoints, scan for malware, manage quarantine and blocklist entries, and list groups and policies."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Bitdefender GravityZone connector [bitdefender-gravityzone-action-type]

The Bitdefender GravityZone connector communicates with GravityZone Cloud through its JSON-RPC 2.0 API. It supports endpoint search, endpoint isolation and restore, on-demand scanning, task monitoring, quarantine management, blocklist operations, and configuration discovery. On-premises GravityZone deployments aren't supported.

This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(API only)_ aren't available to agents yet. You can run them with the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API. In the request body, set `params.subAction` to the action name (for example `"isolateEndpoint"`) and `params.subActionParams` to the input fields listed under that action below.

## Create connectors in {{kib}} [define-bitdefender-gravityzone-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Get API credentials [bitdefender-gravityzone-api-credentials]

1. Sign in to the [GravityZone Control Center](https://gravityzone.bitdefender.com).
2. Open the user menu in the upper-right corner and select **My Account**.
3. In the **API keys** section, select **Add** and enter a description.
4. Enable the API areas for the actions you use: **Network**, **Incidents**, **Quarantine**, and **Policies**. Then select **Generate**.
5. Copy the API key. GravityZone doesn't show it again after you close the window.
6. In the **Control Center API** section of the same page, copy the **Access URL**.

:::{note}
The connection test always calls a **Network** API endpoint. **Save & test** opens the **Test** tab; you then click **Run** to execute it. The **Network** API area must be enabled on the key when you click **Run**, or the test fails. If you only need actions in another area (for example `listPolicies`), you can keep the key scoped to **Policies** only and use **Save** to save the connector without running the test.
:::

### Connector configuration [bitdefender-gravityzone-connector-configuration]

Bitdefender GravityZone connectors have the following configuration properties:

GravityZone API access URL
:   Full base URL of the GravityZone Cloud API, up to and including `/api`. Required. Copy it from the **Access URL** field in the GravityZone Control Center, for example `https://cloudap.gravityzone.bitdefender.com/api`. The host depends on your GravityZone Cloud instance, and the URL must use HTTPS.

API key
:   The GravityZone API key you copied in [Get API credentials](#bitdefender-gravityzone-api-credentials). The connector sends it with HTTP Basic authentication, as the username with an empty password.

### Connector networking configuration [bitdefender-gravityzone-networking]

You can restrict the hosts the connector can reach with the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting. Add your GravityZone Cloud host (for example `cloudap.gravityzone.bitdefender.com`) to that list.

### Test connectors [bitdefender-gravityzone-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test calls `getNetworkInventoryItems` with a single-item page to verify the API key and the Network API area permission.

## Connector actions [bitdefender-gravityzone-connector-actions]

The Bitdefender GravityZone connector exposes the following actions:

`searchEndpoints`
:   Search the GravityZone network inventory by name or IP address with `filters.search`, or by exact IP address with `filters.details.ip`. Returns endpoints and groups with their IDs, names, IPs, and isolation status. Before you pass an ID to `scanEndpoint`, check the item's `type`, because `scanEndpoint` accepts both endpoint and group IDs. Paginated: Set `page` (1-based) and `perPage` (max 100). Requires the **Network** API area.

`getEndpoint`
:   Get full details for a single endpoint: OS, agent status, applied policy, and isolation state. Use to enrich alerts or verify isolation. Requires the **Network** API area.

`getTask`
:   Poll the status of an asynchronous task. Status: 1=Pending, 2=In progress, 3=Finished. Set `returnSubtasks` to true for per-endpoint detail. Requires the **Network** API area.

`isolateEndpoint` _(API only)_
:   Network-isolate one or more endpoints. The endpoint retains connectivity to GravityZone but is cut off from all other network traffic. Returns task IDs. Validation is all-or-nothing: if any endpoint ID is invalid, the entire request is rejected. Requires the **Incidents** API area.
    - `endpointIds` (required): Array of endpoint IDs to isolate. Each must be a 24-character hex string. Max 1,000.

`restoreEndpointFromIsolation` _(API only)_
:   Restore one or more endpoints from network isolation, reconnecting them to the network. Returns task IDs. Requires the **Incidents** API area.
    - `endpointIds` (required): Array of endpoint IDs to restore. Each must be a 24-character hex string. Max 1,000.

`scanEndpoint`
:   Launch an antimalware scan on endpoints or groups. Scan types: 1=Quick, 2=Full, 3=Memory, 4=Custom. Returns task ID(s). Requires the **Network** API area.

`listQuarantineItems`
:   List quarantined files for the account with optional endpoint filtering. Each item includes threat name, original file path, endpoint name, and quarantine date. Paginated. Requires the **Quarantine** API area.

`restoreQuarantineItem` _(API only)_
:   Restore one or more quarantined files to their original or a specified location. Optionally adds an exclusion policy to prevent re-detection. Requires the **Quarantine** API area.
    - `quarantineItemsIds` (required): Array of quarantine item IDs to restore. Retrieve them with `listQuarantineItems`. Max 100.
    - `locationToRestore` (optional): Absolute path to restore the file to. Restores to the original location if omitted.
    - `addExclusionInPolicy` (optional): Set to `true` to add an exclusion policy that prevents the file from being re-detected.

`deleteQuarantineItem` _(API only)_
:   Permanently delete one or more quarantined files. Deletion is irreversible. Requires the **Quarantine** API area.
    - `quarantineItemsIds` (required): Array of quarantine item IDs to delete. Retrieve them with `listQuarantineItems`. Max 100.

`quarantineFile` _(API only)_
:   Quarantine a specific file by absolute path on one or more endpoints. The endpoint must have the EDR Sensor module in Detection and prevention mode. Requires the **Quarantine** API area.
    - `endpointIds` (required): Array of endpoint IDs on which to quarantine the file. Each must be a 24-character hex string. Max 100.
    - `filePath` (required): Absolute path of the file to quarantine on each target endpoint.

`addToBlocklist`
:   Add file hashes (SHA256 or MD5) to the GravityZone blocklist applied across all managed endpoints. Requires the **Incidents** API area and a GravityZone EDR or XDR license. Without that license, the action returns a permission error.

`getBlocklistItems`
:   List blocklist entries for the company. Each item shows the hash type, hash value, source, and optional filename. Paginated. Requires the **Incidents** API area.

`removeFromBlocklist` _(API only)_
:   Remove an entry from the GravityZone blocklist by its item ID. Requires the **Incidents** API area.
    - `hashItemId` (required): ID of the blocklist entry to remove. Retrieve it with `getBlocklistItems`.

`listGroups`
:   List custom endpoint groups under a parent node. Omit `parentId` for top-level groups. Returns all child groups in one call (no pagination). Requires the **Network** API area.

`listPolicies`
:   List security policies defined in the GravityZone account. Paginated. Requires the **Policies** API area.
