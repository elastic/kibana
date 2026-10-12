---
navigation_title: "SolarWinds Platform"
type: reference
description: "Use the SolarWinds Platform connector to run SWQL queries, list, read, and acknowledge active alerts, and look up nodes in a self-hosted SolarWinds Platform server."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# SolarWinds Platform connector [solarwinds-platform-action-type]

The SolarWinds Platform connector uses the [SolarWinds Information Service (SWIS) REST API](https://solarwinds.github.io/OrionSDK/docs/rest/) to read alerts and device data from a self-hosted SolarWinds Platform server (formerly Orion Platform), and to acknowledge alerts. Use it to triage SolarWinds network alerts in a workflow: find the active alerts, look up the affected device and the devices around it, and acknowledge the alert when the triage is done.

This connector is currently available in **Workflows** only.

## Create connectors in {{kib}} [define-solarwinds-platform-ui]

Create a SolarWinds Platform connector from the **{{connectors-ui}}** page. To open the page, find **{{connectors-ui}}** in the navigation or under **Alerts and Insights / Connectors** in the [global search bar](docs-content://explore-analyze/find-and-organize/find-apps-and-objects.md).

### Connector configuration [solarwinds-platform-connector-configuration]

SWIS URL
:   The protocol, host, and port of the SolarWinds Information Service on the main polling engine, for example `https://orion.example.com:17774`. Don't include a path. SolarWinds Platform 2023.1 and later use port 17774. Earlier versions use port 17778.

Username and password
:   A SolarWinds Platform account, for example a local Orion account or `DOMAIN\user`. The connector sends them with HTTP Basic authentication.

CA certificate (PEM) and verification mode
:   SWIS uses a self-signed certificate by default. Paste the certificate authority in PEM format to verify it, or set the verification mode to **none** to turn off verification.

## Available actions [solarwinds-platform-available-actions]

| Action | Description |
|--------|-------------|
| `query` | Run a read-only SWQL query and return the rows (at most 1,000). Parameters: `query` (required, a SWQL `SELECT` statement that references values as `@name`), `parameters` (named values for the query). |
| `listActiveAlerts` | List the active alerts, newest first, with the alert name, severity, message, acknowledged state, triggering entity, and related node. Parameters: `severities`, `acknowledged`, `triggeredAfter` (ISO 8601 time), `alertName`, `nodeId`, `limit` (default 50, maximum 500), `offset` (default 0). |
| `getAlert` | Get one active alert with its notes and alert definition description. Parameters: `alertActiveId` or `alertObjectId` (exactly one is required). |
| `acknowledgeAlert` | Acknowledge active alerts and save a note on them. Returns the IDs that are now acknowledged and the IDs that match no active alert. Parameters: `alertObjectIds` (required, 1 to 100 `AlertObjectID` values, not `AlertActiveID` values), `note`. |
| `getNode` | Get one node (a monitored device) with its status, vendor, model, location, response time, CPU and memory load, maintenance state, and custom properties. Parameters: `nodeId`, `ipAddress`, or `caption` (exactly one is required). |
| `searchNodes` | Search nodes by name or IP text, status, vendor, model, or a custom property value. Parameters: `search`, `statuses`, `vendor`, `machineType`, `customProperty` (`name` and `value`), `limit` (default 50, maximum 500), `offset` (default 0). |

The list actions return `totalRows` and, when more rows exist, a `nextOffset` value to pass as `offset` in the next call.

## Connector networking configuration [solarwinds-platform-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

{{kib}} must be able to reach the SWIS port on the main polling engine. Open that port in the server firewall for the {{kib}} host.

## Get API credentials [solarwinds-platform-api-credentials]

1. Sign in to the SolarWinds Platform web console as an administrator.
2. Go to **Settings > All Settings > Manage Accounts** and add a SolarWinds individual account, or select an existing Windows account. The `query` action can read all data that this account can read, including device credentials such as SNMP community strings. Use an account with only the permissions and object limitations you need.
3. To use `acknowledgeAlert`, turn on **Allow Account to Clear Events, Acknowledge Alerts and Syslogs** for the account. The other actions only read data.
4. Enter the account username and password in the connector.
5. If the server uses the default self-signed certificate, paste its CA certificate in PEM format, or set the verification mode to **none**.
