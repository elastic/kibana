---
navigation_title: "UniFi"
type: reference
description: "Use the UniFi connector to inventory sites, devices, clients, and networks from UniFi Network and to inspect cameras, sensors, and other devices from UniFi Protect on a single UniFi console."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# UniFi connector [unifi-action-type]

The UniFi connector reads and controls a Ubiquiti UniFi console — a Dream Machine, Cloud Gateway, or UNVR — through both applications it hosts. It lets a workflow or agent inventory sites, devices, clients, networks, and WAN uplinks from UniFi Network, inspect cameras, sensors, lights, and the NVR from UniFi Protect, and act on what it finds by restarting a device, power-cycling a PoE port, authorizing a guest, or repositioning a PTZ camera.

## Overview

This is a **custom connector** that talks to the UniFi Network and UniFi Protect integration APIs. Both applications run on the same console behind separate reverse-proxy prefixes and share one API key, so a single connector covers both:

* `{console URL}/proxy/network/integration/v1/…` — UniFi Network
* `{console URL}/proxy/protect/integration/v1/…` — UniFi Protect

You configure the console URL and an API key when creating the connector; every action then runs under that key's account and permissions.

All [UniFi actions](#unifi-available-actions), across both UniFi Network and UniFi Protect, are available as a tool for Agent Builder agents and as a sub-action on a UniFi workflow step.

The two APIs do not share conventions beyond authentication and host. UniFi Network is site-scoped and paginated: list actions accept `offset`, `limit`, and `filter`, and return an envelope of `offset`, `limit`, `count`, `totalCount`, and `data`. UniFi Protect is console-scoped and unpaginated: list actions return a plain array.

## Create connectors in {{kib}} [define-unifi-ui]

You can create a UniFi connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [unifi-connector-configuration]

Console URL
:   The base URL of the UniFi console, for example `https://192.168.1.1`. Do not include `/proxy/network/integration` or `/proxy/protect/integration` — the connector appends the right prefix per action. To reach a console through the UniFi Site Manager Cloud Connector instead of over the LAN, use `https://api.ui.com/v1/connector/consoles/your-console-id`.

Authentication
:   API key, sent as the `X-API-KEY` header. See [Get API credentials](#unifi-api-credentials) below. The key inherits the permissions of the account that created it, so use an account with access to both the Network and Protect applications — see [Required permissions](#unifi-required-permissions).

## Available actions [unifi-available-actions]

### UniFi Network [unifi-network-actions]

All UniFi Network actions except `getNetworkInfo` are site-scoped and require a `siteId` from `listSites`. Actions marked as filterable accept a `filter` parameter that uses the UniFi Network filter grammar (`property.function(arguments)`, composed with `and(…)`, `or(…)`, and `not(…)`), not KQL or Lucene.

| Action | Description |
|--------|-------------|
| `getNetworkInfo` | Get the UniFi Network application version. No parameters. |
| `listSites` | List the Network sites on the console. Every other Network action needs a site ID from here. Parameters: `offset`, `limit`, `filter`. |
| `listDevices` | List adopted devices (access points, switches, gateways) with model, MAC, IP, state, and firmware status. Parameters: `siteId` (required), `offset`, `limit`, `filter`. |
| `getDevice` | Get full details for one adopted device, including port and radio interfaces. Parameters: `siteId`, `deviceId` (both required). |
| `getDeviceStatistics` | Get the latest uptime, CPU, memory, and throughput statistics for one device. Parameters: `siteId`, `deviceId` (both required). |
| `listClients` | List currently connected clients, wired and wireless, plus active VPN connections. Parameters: `siteId` (required), `offset`, `limit`, `filter`. |
| `getClient` | Get full details for one connected client, including the device and port or radio it is attached to. Parameters: `siteId`, `clientId` (both required). |
| `listNetworks` | List the networks (VLANs, LANs, guest networks) configured on a site. Parameters: `siteId` (required), `offset`, `limit`, `filter`. |
| `listWans` | List the WAN uplink interfaces on a site and their status. Filtering is not supported on this endpoint. Parameters: `siteId` (required), `offset`, `limit`. |
| `listFirewallPolicies` | List firewall policies with their source and destination zones, action, and enabled state. Parameters: `siteId` (required), `offset`, `limit`, `filter`. |
| `restartDevice` | Restart an adopted device. Disruptive: the device and everything behind it drops offline for about a minute. Parameters: `siteId`, `deviceId` (both required). |
| `powerCyclePort` | PoE power-cycle a single switch port, rebooting only the device powered by it. Parameters: `siteId`, `deviceId`, `portIdx` (all required). |
| `authorizeGuestAccess` | Authorize a guest client, optionally capping session duration, data, and rate. Parameters: `siteId`, `clientId` (both required), `timeLimitMinutes`, `dataUsageLimitMBytes`, `rxRateLimitKbps`, `txRateLimitKbps`. |
| `unauthorizeGuestAccess` | Revoke a guest client's authorization and disconnect it. Parameters: `siteId`, `clientId` (both required). |

### UniFi Protect [unifi-protect-actions]

UniFi Protect actions are console-scoped and take no site ID.

| Action | Description |
|--------|-------------|
| `getProtectInfo` | Get the UniFi Protect application version. Use it to confirm Protect is installed on this console. No parameters. |
| `listProtectDevices` | List every Protect device of one family. Parameters: `deviceType` (required) — one of `cameras`, `lights`, `sensors`, `chimes`, `sirens`, `speakers`, `viewers`, `fobs`, `relays`, `bridges`, `link-stations`, `alarm-hubs`. |
| `getProtectDevice` | Get full details for one Protect device, including family-specific settings. Parameters: `deviceType`, `deviceId` (both required). |
| `getNvr` | Get details about the Protect NVR itself, including version, storage state, and arm mode. No parameters. |
| `getCameraSnapshot` | Capture a still JPEG from a camera, returned base64-encoded. Parameters: `cameraId` (required), `channel`, `highQuality`. |
| `movePtzCameraToPreset` | Move a PTZ camera to a saved preset. Parameters: `cameraId`, `slot` (both required); slot `-1` is the home preset. |

:::{warning}
`getCameraSnapshot` returns a large base64 binary payload. Only call it when the image will actually be processed downstream, for example by an {{es}} ingest pipeline attachment processor. To check whether a camera is online, use `getProtectDevice` and read its `state` instead.
:::

:::{important}
Snapshots from current UniFi cameras are typically larger than 1 MB, which exceeds the default `xpack.actions.maxResponseContentLength` of `1mb`. Until an operator raises that setting, `getCameraSnapshot` fails with a response-size error; every other action in this connector is unaffected. Raise it deliberately — it is a memory guard that applies to **all** connectors, not just UniFi:

```yaml
xpack.actions.maxResponseContentLength: 10mb
```
:::

## Required permissions [unifi-required-permissions]

UniFi API keys do not carry per-action scopes. Access is governed entirely by the role of the account that created the key, and the Network and Protect applications grant access separately. An account without access to one application gets a 401 or 403 from that application's actions while the other application's actions keep working, so create the key with an account that can open both.

The read actions work with a **Viewer** role in the relevant application. `restartDevice`, `powerCyclePort`, `authorizeGuestAccess`, `unauthorizeGuestAccess`, and `movePtzCameraToPreset` require an **Admin** role — a Viewer account gets a permission error from those actions.

## Connector networking configuration [unifi-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

A local UniFi console must be network-reachable from {{kib}} and normally presents a self-signed certificate, so add its host to `xpack.actions.customHostSettings` with the appropriate certificate authority or TLS settings. Consoles reached through the Site Manager Cloud Connector at `api.ui.com` use a publicly trusted certificate and need no extra TLS configuration.

## Get API credentials [unifi-api-credentials]

For a local console:

1. Sign in to the UniFi OS interface on your console with an account that can access both the Network and Protect applications (see [Required permissions](#unifi-required-permissions) above — use an **Admin** account if the connector needs to restart devices, power-cycle ports, authorize guests, or move PTZ cameras).
2. Go to **Settings** > **Control Plane** > **Integrations**.
3. Select **Create API Key** and name the key.
4. Copy the generated key — UniFi only shows it once.
5. When configuring the connector, enter the key as the API key, and your console's base URL in the Console URL field.

To reach a console through the Site Manager Cloud Connector instead:

1. Sign in to the UniFi Site Manager at [unifi.ui.com](https://unifi.ui.com).
2. Go to **Settings** > **API Keys**.
3. Select **Create New API Key** and copy the generated key.
4. When configuring the connector, set the Console URL to `https://api.ui.com/v1/connector/consoles/your-console-id`, using the console ID shown for your console in the Site Manager.
