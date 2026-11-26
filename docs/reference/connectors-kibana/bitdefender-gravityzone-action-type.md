---
navigation_title: "Bitdefender GravityZone"
type: reference
description: "Search and isolate endpoints, scan for malware, manage quarantine and blocklist entries, and discover groups and policies via the Bitdefender GravityZone JSON-RPC API connector."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/bitdefender-gravityzone-action-type.html
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Bitdefender GravityZone connector [bitdefender-gravityzone-action-type]

The Bitdefender GravityZone connector communicates with GravityZone Cloud via its JSON-RPC 2.0 API. It supports endpoint search, endpoint isolation and restore, on-demand scanning, task monitoring, quarantine management, blocklist operations, and configuration discovery.

This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.

## Create connectors in {{kib}} [define-bitdefender-gravityzone-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Get API credentials [bitdefender-gravityzone-api-credentials]

1. Sign in to the [GravityZone Control Center](https://gravityzone.bitdefender.com).
2. Navigate to **My Account → API keys**.
3. Click **Add** and assign a description.
4. Enable the required API areas: **Network**, **Incidents**, **Quarantine**, **Policies**.
5. Copy the generated API key.

### Connector configuration [bitdefender-gravityzone-connector-configuration]

Bitdefender GravityZone connectors have the following configuration properties:

GravityZone API access URL
:   Full base URL of the GravityZone Cloud API, up to and including `/api`. Required. Example: `https://cloudap.gravityzone.bitdefender.com/api`. The URL varies by account region (for example `https://eu.gravityzone.bitdefender.com/api`). The URL must use HTTPS. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, add your GravityZone Cloud host.

Authentication
:   Uses **HTTP Basic** with the GravityZone API key as the username and an empty password. Provide the API key from the GravityZone Control Center (My Account → API keys). The key must have the API areas enabled for the actions you use: Network, Incidents, Quarantine, and Policies.

### Connector networking configuration [bitdefender-gravityzone-networking]

You can restrict the hosts the connector can reach with the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting. Add your GravityZone Cloud host (for example `cloudap.gravityzone.bitdefender.com`) to that list.

## Test connectors [bitdefender-gravityzone-connector-test]

You can test connectors when you create or edit the connector in {{kib}}. The test calls `getNetworkInventoryItems` with a single-item page to verify the API key and the Network API area permission.

## Connector actions [bitdefender-gravityzone-connector-actions]

The Bitdefender GravityZone connector exposes the following actions:

`searchEndpoints`
:   Find managed endpoints by name, IP or hostname. Returns IDs, names, IPs, group and isolation status. Use to find endpoint IDs before isolation or scanning. Paginated: set `page` (1-based) and `perPage` (max 100). Requires the **Network** API area.

`getEndpoint`
:   Get full details for a single endpoint: OS, agent status, applied policy, and isolation state. Use to enrich alerts or verify isolation. Requires the **Network** API area.

`getTask`
:   Poll the status of an asynchronous task. Status: 1=Pending, 2=In progress, 3=Finished. Set `returnSubtasks` to true for per-endpoint detail. Requires the **Network** API area.

`isolateEndpoint` _(not yet available)_
:   Network-isolate one or more endpoints. The endpoint retains connectivity to GravityZone but is cut off from all other network traffic. Returns task IDs. Validation is all-or-nothing: if any endpoint ID is invalid, the entire request is rejected. Requires the **Incidents** API area.

`restoreEndpointFromIsolation` _(not yet available)_
:   Restore one or more endpoints from network isolation, reconnecting them to the network. Returns task IDs. Requires the **Incidents** API area.

`scanEndpoint`
:   Launch an antimalware scan on endpoints or groups. Scan types: 1=Quick, 2=Full, 3=Memory, 4=Custom. Returns task ID(s). Requires the **Network** API area.

`listQuarantineItems`
:   List quarantined files for the account with optional endpoint filtering. Each item includes threat name, original file path, endpoint name, and quarantine date. Paginated. Requires the **Quarantine** API area.

`restoreQuarantineItem` _(not yet available)_
:   Restore one or more quarantined files to their original or a specified location. Optionally adds an exclusion policy to prevent re-detection. Requires the **Quarantine** API area.

`deleteQuarantineItem` _(not yet available)_
:   Permanently delete one or more quarantined files. Deletion is irreversible. Requires the **Quarantine** API area.

`quarantineFile` _(not yet available)_
:   Quarantine a specific file by absolute path on one or more endpoints. The endpoint must have the EDR Sensor module in Detection and prevention mode. Requires the **Quarantine** API area.

`addToBlocklist`
:   Add file hashes (SHA256 or MD5) to the GravityZone blocklist applied across all managed endpoints. Requires the **Incidents** API area and an EDR licence. The connector returns a clear error when the licence is insufficient.

`getBlocklistItems`
:   List blocklist entries for the company. Each item shows the hash type, hash value, source, and optional filename. Paginated. Requires the **Incidents** API area.

`removeFromBlocklist` _(not yet available)_
:   Remove an entry from the GravityZone blocklist by its item ID. Requires the **Incidents** API area.

`listGroups`
:   List custom endpoint groups under a parent node. Omit `parentId` for top-level groups. Returns all child groups in one call (no pagination). Requires the **Network** API area.

`listPolicies`
:   List security policies defined in the GravityZone account. Paginated. Requires the **Policies** API area.
