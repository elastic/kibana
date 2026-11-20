---
navigation_title: "Microsoft Defender for Endpoint"
type: reference
description: "Contain and investigate devices in Microsoft Defender for Endpoint — list, isolate, and release devices, run live response scripts and antivirus scans, and manage block and allow indicators."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Microsoft Defender for Endpoint connector [microsoft-defender-for-endpoint-action-type]

Contain and investigate devices in Microsoft Defender for Endpoint — list, isolate, and release devices, run live response scripts and antivirus scans, and manage block and allow indicators.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Overview [microsoft-defender-for-endpoint-overview]

Response actions such as `isolateHost`, `runAntivirusScan`, and `collectInvestigationPackage` run asynchronously on the device. Each returns a machine action with status `Pending`. Poll it with `getActions` until its status is `Succeeded`, `Failed`, `TimeOut`, or `Cancelled`.

The actions marked _(not yet available)_ run arbitrary scripts on a device or change many tenant-wide indicators in one call, so they are not exposed to agents.

Alerts, incidents, and advanced hunting are not part of this connector.

## Create connectors in {{kib}} [define-microsoft-defender-for-endpoint-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [microsoft-defender-for-endpoint-connector-configuration]

Microsoft Defender for Endpoint connectors have the following configuration properties:

Defender cloud
:   The Microsoft Defender cloud and region, which sets the API host. The default is `commercial` (`api.security.microsoft.com`). The regional commercial clouds (`commercial-us`, `commercial-eu`, `commercial-uk`, `commercial-au`, `commercial-swa`, `commercial-ina`, `commercial-aea`) use their regional host, for example `eu.api.security.microsoft.com`. `gcc` uses `api-gcc.securitycenter.microsoft.us`, and `gcc-high` and `dod` use `api-gov.securitycenter.microsoft.us`. The token URL and the scope must belong to the same cloud.

Custom API URL
:   Optional. Leave it empty to use the API host of the Defender cloud. Set it only to reach the API through a proxy, and include `/api`. The URL must use `https`, because every request carries the access token; `http` is accepted only for `localhost`.

### Authentication [microsoft-defender-for-endpoint-connector-authentication]

The connector authenticates as a Microsoft Entra app registration with the OAuth 2.0 client credentials flow, using either a client secret (recommended) or a certificate.

Token URL
:   The Microsoft Entra token endpoint for your tenant: `https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token`. For GCC High and DoD, use `login.microsoftonline.us` instead of `login.microsoftonline.com`.

Client ID
:   The Application (client) ID of the app registration.

Client secret
:   With OAuth client credentials: a client secret of the app registration.

Certificate (PEM) and Private key (PEM)
:   With OAuth client credentials (Private Key JWT): the certificate registered on the app registration and its private key. Enter the private key passphrase if the key is encrypted.

Scope
:   The token audience of your Defender cloud. Required.
    - Commercial cloud and its regions: `https://api.securitycenter.microsoft.com/.default`
    - GCC: `https://api-gcc.securitycenter.microsoft.us/.default`
    - GCC High and DoD: `https://api-gov.securitycenter.microsoft.us/.default`

## Test connectors [microsoft-defender-for-endpoint-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test requests an access token and lists one device to verify the credentials, the Defender cloud, and the API URL.

## Connector actions [microsoft-defender-for-endpoint-connector-actions]

The Microsoft Defender for Endpoint connector has the following actions. List actions return one page per call. Pass `top` (default 100, up to 500) and `skip` to page through results. The API sends no next-page link: when `hasMore` is `true`, call the action again with `skip` set to `nextSkip`. Many list actions also accept `filter`, an OData `$filter` expression of up to 2,000 characters. A filter that matches nothing returns an empty list, not an error.

### Devices [microsoft-defender-for-endpoint-devices]

`getAgentList`
:   List onboarded devices. Narrow the list by `deviceId` (up to 50), `hostname` (a prefix of the computer DNS name, up to 10), or `ipAddress` (up to 50), each one value or a list, or with an OData filter. To find the device that used an IP address at a given time in the past 30 days, pass a single `ipAddress` with `ipSeenAt` (UTC, for example `2026-11-10T14:30:00Z`); `ipSeenAt` can't be combined with the other filters, `top`, or `skip`.

`getAgentDetails`
:   Get one device by its device ID or computer name, including its OS, health status, risk score, exposure level, last IP addresses, and tags.

`getMachineUsers`
:   List the users who logged on to a device. Accepts a device ID or a computer name.

`getDeviceAvHealth`
:   Get the Microsoft Defender Antivirus health of devices: antivirus mode, whether the signature, engine, and platform are up to date, and the last quick and full scan results.

`updateMachineTag`
:   Add (`Add`) or remove (`Remove`) a device tag of up to 200 characters. Removing a tag the device doesn't have succeeds. Tags can drive device group membership, so a change can move the device into or out of a tag-based device group.

### Response actions [microsoft-defender-for-endpoint-response-actions]

Response actions require a comment (up to 2,000 characters), which is shown in the Microsoft Defender portal action center. They return a machine action with status `Pending`. Only one action of a kind can be pending on a device at a time; refer to [Usage notes](#microsoft-defender-for-endpoint-usage-notes).

`isolateHost`
:   Isolate a device from the network. `Full` (the default) blocks all traffic except the Defender service, `Selective` also keeps Outlook, Teams, and Skype for Business working, and `UnManagedDevice` applies only to devices that aren't onboarded. Undo with `releaseHost`.

`releaseHost`
:   Release a device from network isolation.

`restrictAppExecution`
:   Restrict a device so only Microsoft-signed applications can run. The device stays on the network. Requires Microsoft Defender Antivirus in active mode. Undo with `removeAppRestriction`.

`removeAppRestriction`
:   Remove the app execution restriction from a device.

`runAntivirusScan`
:   Start a `Quick` or `Full` Microsoft Defender Antivirus scan on a device. If a scan is already pending, returns that scan.

`stopAndQuarantineFile`
:   Stop the running processes of a file (by SHA-1) on a device and quarantine the file. Only a quarantine restore in the Defender portal brings the file back. Requires Windows 10 version 1703 or later, and doesn't apply to files signed by Microsoft or trusted publishers. If the file isn't on the device, the action fails with a not-found error.

`collectInvestigationPackage`
:   Collect a forensic investigation package from a device. When the action has succeeded, get a download link with `getInvestigationUri`.

`getFile`
:   Collect a file from a device with live response, by its full path on the device (for example `C:\Windows\Temp\sample.exe`). When the action has succeeded, get a download link with `getActionResults`.

`runScript` _(not yet available)_
:   Run a script from the live response library on a device, with optional arguments. Pass the script's file name as listed by `getLibraryFiles`, without a path. When the action has succeeded, get the script output with `getActionResults`.

### Machine actions [microsoft-defender-for-endpoint-machine-actions]

`getActions`
:   List machine actions. Narrow the list by `actionId` (to poll one action), `machineId`, `status`, or `type`, each one value or a list of up to 50, or with an OData filter. A just-created action can be missing for a few seconds.

`cancelAction`
:   Cancel a machine action that is still `Pending` or `InProgress`. Requires a comment. An action created a few seconds earlier can return a not-found error; retry after a few seconds.

`getActionResults`
:   Get a download link, valid for 30 minutes, for the output of a completed `runScript` or `getFile` action. Other action types return an error.

`getInvestigationUri`
:   Get a short-lived download link for a package collected by `collectInvestigationPackage`, after that action has succeeded. Limited to 2 calls per minute.

`getLibraryFiles`
:   List the scripts and files in the live response library.

### Files, IP addresses, domains, and users [microsoft-defender-for-endpoint-entities]

`getFileInfo`
:   Get a file's details by SHA-1 or SHA-256 hash, including its signer, publisher, and global prevalence. An unknown file returns a not-found error.

`getFilePrevalence`
:   Get a file's prevalence in your organization and globally, by SHA-1 or SHA-256 hash. An unknown file returns a not-found error.

`getFileDevices`
:   List the devices where a file (by SHA-1 only) was seen. An unknown file returns an empty list.

`getIpPrevalence`
:   Get an IPv4 address's prevalence in your organization. An IP address that was never seen returns zero prevalence, not an error. IPv6 addresses aren't supported by the Defender API.

`getDomainPrevalence`
:   Get a domain's prevalence in your organization. A domain that was never seen returns zero prevalence, not an error.

`getDomainDevices`
:   List the devices that communicated with a domain (up to 500). A domain that was never seen returns an empty list.

`getUserDevices`
:   List the devices a user logged on to. Accepts a user name (including names with spaces), a UPN, or `DOMAIN\user`; the connector looks up the bare account name. An unknown user returns an empty list.

### Vulnerabilities [microsoft-defender-for-endpoint-vulnerabilities]

`listVulnerabilities`
:   List vulnerabilities (CVEs) known to Microsoft Defender Vulnerability Management, optionally filtered, or the vulnerabilities of one software product with `softwareId` (for example `microsoft-_-windows_10`). `softwareId` can't be combined with `filter`.

### Indicators [microsoft-defender-for-endpoint-indicators]

The indicator actions use the Microsoft Defender for Endpoint [Indicator API](https://learn.microsoft.com/en-us/defender-endpoint/api/ti-indicator) on the API host of the connector's Defender cloud. Microsoft offers custom indicators through more than one API, and this is the current one for Defender for Endpoint. The connector doesn't use the Microsoft Graph `tiIndicators` API, which Microsoft has deprecated and offers only in the Graph beta version. Each action calls the following endpoint:

| Action | Endpoint |
| --- | --- |
| `listIndicators` | `GET /api/indicators` |
| `submitIndicator` | `POST /api/indicators` |
| `deleteIndicator` | `DELETE /api/indicators/{id}` |
| `batchSubmitIndicators` | `POST /api/indicators/import` |
| `batchDeleteIndicators` | `POST /api/indicators/BatchDelete` |

Indicators that the connector creates appear in the Microsoft Defender portal under **Settings** > **Endpoints** > **Indicators**.

`listIndicators`
:   List custom indicators of compromise, optionally filtered, for example by `indicatorValue` or `action`. A tenant with no indicators returns an empty list.

`submitIndicator`
:   Create or update a tenant-wide indicator for a file hash, certificate, IPv4 address, domain, or URL, with an action such as `Audit`, `Block`, or `Allowed`. The legacy `Alert` and `AlertAndBlock` actions aren't supported: use `Audit` or `Block` with `generateAlert` set to `true` instead. IP indicators take a single public IPv4 address; private ranges, IPv6 addresses, and CIDR ranges aren't supported. Submitting the same value with a different action creates a second indicator. Microsoft stores `Block` on a certificate thumbprint as `BlockAndRemediate`. `Audit` requires `generateAlert` set to `true`, and `educateUrl` applies only to a URL indicator with `Block` or `Warn`. Set `expirationTime` in UTC with a `Z` suffix, for example `2026-12-31T00:00:00Z`; without it, the indicator never expires.

`deleteIndicator` _(not yet available)_
:   Delete a custom indicator by ID. Deleting an ID that doesn't exist also succeeds.

`batchSubmitIndicators` _(not yet available)_
:   Create or update up to 500 custom indicators in one call, with the same fields and rules as `submitIndicator`. The call succeeds even when some indicators fail, and returns the result of each indicator and the number that failed.

`batchDeleteIndicators` _(not yet available)_
:   Delete up to 500 custom indicators by ID in one call. Unknown IDs aren't rejected.

## Usage notes [microsoft-defender-for-endpoint-usage-notes]

- Most APIs allow 100 calls per minute per tenant. Live response allows 10, indicator batches and antivirus health allow 30, and `getInvestigationUri` allows 2. The connector retries a rate-limited call while its total wait stays within 30 seconds, then returns the rate-limit error.
- A `403` error means the app registration lacks the permission named in the error, or the device is in a device group the app can't act on. A `403` that reports no active license means the connector's Defender cloud doesn't match the tenant, or the tenant has no Defender for Endpoint license.
- If another action of the same kind is pending on a device, a response action usually fails with an error that names the pending action. Wait for it with `getActions` or cancel it with `cancelAction`. Microsoft sometimes returns the pending action instead of an error, so check that the returned action ID is a new one.
- Live response (`getFile` and `runScript`) must be turned on in the Microsoft Defender portal under **Settings** > **Endpoints** > **Advanced features**. Unsigned scripts also need **Live response unsigned script execution**.

## Differences from the Microsoft Defender for Endpoint connector [microsoft-defender-for-endpoint-v1-differences]

This connector (`.microsoft_defender_endpoint2`) sits next to the earlier [Microsoft Defender for Endpoint connector](defender-action-type.md) (`.microsoft_defender_endpoint`), referred to here as V1, which keeps working. You can reuse the Microsoft Entra app registration of a V1 connector. Add the permissions of any new actions you use, as listed in [Permissions by action](#microsoft-defender-for-endpoint-permissions).

The nine V1 actions keep their names: `getAgentList`, `getAgentDetails`, `isolateHost`, `releaseHost`, `runScript`, `getLibraryFiles`, `getActions`, `getActionResults`, and `cancelAction`. Their inputs and outputs differ as follows.

### Input changes [microsoft-defender-for-endpoint-v1-input-changes]

| Action | V1 input | V2 input |
| --- | --- | --- |
| `getAgentDetails` | `id` | `machineId`, which also accepts a computer name |
| `getAgentList` | `id` | `deviceId` |
| `getAgentList` | `computerDnsName` (exact match) | `hostname` (prefix match, up to 10 values), or `filter` with `computerDnsName eq '<name>'` for an exact match |
| `getAgentList` | `lastIpAddress` | `ipAddress` |
| `getAgentList` | `version`, `deviceValue`, `aaDeviceId`, `machineTags`, `lastSeen`, `exposureLevel`, `onboardingStatus`, `healthStatus`, `osPlatform`, `riskScore`, `rbacGroupId` | `filter`, an OData expression, for example `healthStatus eq 'Active'`. Use `aadDeviceId` for the Microsoft Entra device ID. |
| `isolateHost` | `id` | `machineId`. V1 always used `Full` isolation. V2 also accepts `isolationType` (`Full` by default, `Selective`, or `UnManagedDevice`). |
| `releaseHost` | `id` | `machineId` |
| `runScript` | `id` | `machineId` |
| `runScript` | `parameters.scriptName`, `parameters.args` | `scriptName`, `args` |
| `runScript` | `comment` (optional) | `comment` (required) |
| `getActions` | `id` | `actionId` |
| `getActions` | `requestor`, `creationDateTimeUtc` | `filter`, for example `requestor eq 'user@contoso.com'` |
| `getActions` | `sortField`, `sortDirection` | Not supported |
| `getActionResults` | `id` | `actionId` |
| `getAgentList`, `getActions` | `page`, `pageSize` (up to 1,000) | `skip`, `top` (up to 500). `skip` is `(page - 1) * pageSize`. |

`cancelAction` takes the same inputs in both versions: `actionId` and `comment`. `getLibraryFiles` takes no input in either version.

### Output changes [microsoft-defender-for-endpoint-v1-output-changes]

Both versions return the device and machine action records from the Defender API, with the same field names, such as `id`, `computerDnsName`, `healthStatus`, `type`, `status`, `machineId`, `requestor`, `requestorComment`, and `creationDateTimeUtc`. The following outputs differ:

| Action | V1 output | V2 output |
| --- | --- | --- |
| `getAgentList`, `getActions` | `total`: the number of matching records across all pages | No equivalent. `count` is the number of records on the returned page. |
| `getAgentList`, `getActions` | `page`, `pageSize` | `hasMore` (`true` when another page may follow) and `nextSkip` (the `skip` for the next page) |
| `getAgentList`, `getActions`, `getLibraryFiles` | `@odata.context`, `@odata.count` | Removed. `getLibraryFiles` adds `count`. |
| `getAgentDetails`, `isolateHost`, `releaseHost`, `runScript`, `cancelAction` | `@odata.context` | Removed. The other fields are the same. |
| `getActionResults` | The content of the script output file, which V1 downloads | `value`: a link to the output file, valid for 30 minutes. Download the file from that link. |

When a response action fails because another action is pending on the device, V1 returns the Defender error message. V2 also names the pending action, in the form `Conflicting machine action: id=..., type=..., status=...`, so you can wait for it with `getActions` or cancel it with `cancelAction`.

## Get API credentials [microsoft-defender-for-endpoint-api-credentials]

1. In the [Microsoft Entra admin center](https://entra.microsoft.com/), register an application.
2. Under **API permissions**, add **APIs my organization uses** > **WindowsDefenderATP** and add the application permissions for the actions you use: `Machine.Read.All`, `Machine.ReadWrite.All`, `Machine.Isolate`, `Machine.Scan`, `Machine.CollectForensics`, `Machine.LiveResponse`, `Machine.StopAndQuarantine`, `Machine.RestrictExecution`, `Library.Manage`, `File.Read.All`, `Ip.Read.All`, `URL.Read.All`, `User.Read.All`, `Vulnerability.Read.All`, and `Ti.ReadWrite.All`. To find the permission each action needs, refer to [Permissions by action](#microsoft-defender-for-endpoint-permissions).
3. Grant admin consent.
4. Under **Certificates & secrets**, create a client secret, or upload a certificate if you authenticate with a certificate.
5. Copy the tenant ID and the application (client) ID, and the secret value if you use a client secret. Enter them when you create the connector in {{kib}}.

If you also use the Microsoft Defender XDR connector, you can use one app registration for both connectors. Add the Microsoft Graph permissions of the Defender XDR connector next to the WindowsDefenderATP permissions of this connector. Each connector requests a token for its own API, so it uses only its own permissions.

For more information, refer to [Create an app to access Microsoft Defender for Endpoint without a user](https://learn.microsoft.com/en-us/defender-endpoint/api/exposed-apis-create-app-webapp).

### Permissions by action [microsoft-defender-for-endpoint-permissions]

Each action needs the following WindowsDefenderATP application permission. When a permission is missing, the action fails with a `403` error that names the permission.

| Action | Application permission |
| --- | --- |
| Test connector | `Machine.Read.All` |
| `getAgentList` | `Machine.Read.All`. With `ipSeenAt`: `Machine.ReadWrite.All` |
| `getAgentDetails` | `Machine.ReadWrite.All` |
| `getMachineUsers` | `User.Read.All` |
| `getDeviceAvHealth` | `Machine.Read.All` |
| `updateMachineTag` | `Machine.ReadWrite.All` |
| `isolateHost`, `releaseHost` | `Machine.Isolate` |
| `restrictAppExecution`, `removeAppRestriction` | `Machine.RestrictExecution` |
| `runAntivirusScan` | `Machine.Scan` |
| `stopAndQuarantineFile` | `Machine.StopAndQuarantine` |
| `collectInvestigationPackage` | `Machine.CollectForensics` |
| `getFile`, `runScript` | `Machine.LiveResponse` |
| `getActions`, `getActionResults`, `getInvestigationUri` | `Machine.ReadWrite.All` |
| `cancelAction` | The permission of the action you cancel: `Machine.Isolate`, `Machine.Scan`, `Machine.CollectForensics`, `Machine.RestrictExecution`, `Machine.StopAndQuarantine`, or `Machine.LiveResponse` |
| `getLibraryFiles` | `Library.Manage` |
| `getFileInfo`, `getFilePrevalence` | `File.Read.All` |
| `getFileDevices`, `getDomainDevices`, `getUserDevices` | `Machine.ReadWrite.All` |
| `getIpPrevalence` | `Ip.Read.All` |
| `getDomainPrevalence` | `URL.Read.All` |
| `listVulnerabilities` | `Vulnerability.Read.All` |
| `listIndicators` | `Ti.ReadWrite.All`. With `Ti.ReadWrite`, only the indicators the app created are listed. |
| `submitIndicator`, `deleteIndicator`, `batchSubmitIndicators`, `batchDeleteIndicators` | `Ti.ReadWrite.All` |

When a response action fails because another action is pending on the device, the connector looks up the pending action to name it in the error. That lookup needs `Machine.ReadWrite.All`. Without it, the error gives only the ID and type that Microsoft's error message names, if any, and not the pending action's status.

Device groups can limit which devices the app can act on. An action can succeed on some devices and fail with a `403` error on others, even when the app has the permission.
