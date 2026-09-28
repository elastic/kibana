---
navigation_title: "Azure Functions"
type: reference
description: "Use the Azure Functions connector to invoke HTTP-triggered Azure Functions, read function keys, and start, stop, or restart function apps."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Azure Functions connector [azure-functions-action-type]

The Azure Functions connector lets an agent run custom code in Azure without leaving Elastic: invoke an HTTP-triggered function to do remediation or enrichment, read the keys that an invoke needs, resolve a function app and its running state, and restart, stop, or start an app that is wedged or compromised.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Overview

The connector authenticates as a Microsoft Entra app registration (service principal) using the OAuth 2.0 Client Credentials grant.

Azure splits functions across two planes, and this connector uses both:

* The **management plane** ([Azure Resource Manager](https://learn.microsoft.com/en-us/rest/api/appservice/web-apps)) resolves apps and functions, reads keys, and controls an app's lifecycle. These actions authenticate with the service principal.
* The **data plane** (the app's own hostname, such as `my-app.azurewebsites.net`) runs the function. It does not accept the service principal token: it authenticates with a function or host key. The `invoke` action resolves the app's hostname over the management plane first, then sends the key in the `x-functions-key` header.

## Create connectors in {{kib}} [define-azure-functions-ui]

You can create an Azure Functions connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [azure-functions-connector-configuration]

Subscription ID
:   The Azure subscription (a GUID) that every action in this connector operates against.

Token URL
:   The Microsoft Entra v2.0 token endpoint for your tenant: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`, with `{tenant-id}` replaced by your tenant ID.

Client ID
:   The Application (client) ID of the Microsoft Entra app registration.

Client Secret
:   A client secret created for the Microsoft Entra app registration.

The app registration must have the **Reader** role on the subscription for `getFunctionApp`, `listFunctionApps`, `listFunctions`, and `getFunction`. It must have the **Website Contributor** role to restart, stop, or start an app, to re-sync triggers with `listSyncFunctionTriggers`, and to read keys with `listFunctionKeys` or `listHostKeys`.

The `invoke` action does not use the service principal token. It authenticates with a function or host key, which you supply in the `functionKey` parameter.

## Available actions [azure-functions-available-actions]

| Action | Description |
|--------|-------------|
| `invoke` | Invoke an HTTP-triggered function and return its status, headers, and body. Any status the function returns is reported in the `status` field rather than raised as an error; only an authentication failure or a transport error throws. Parameters: `resourceGroupName`, `functionAppName`, `functionName` (all three required), `method`, `route`, `body`, `query`, `functionKey`. |
| `listFunctionKeys` | Read the function-level keys of one function, as a name-to-key map. Parameters: `resourceGroupName`, `functionAppName`, `functionName` (all three required). |
| `getFunctionApp` | Get a function app's configuration and running state. Parameters: `resourceGroupName`, `functionAppName` (both required). |
| `restartFunctionApp` | Restart a function app. Parameters: `resourceGroupName`, `functionAppName` (both required), `softRestart`, `synchronous`. |
| `listFunctions` | List the functions in an app, with each function's trigger config, language, and invoke URL template. Parameters: `resourceGroupName`, `functionAppName` (both required). |
| `listFunctionApps` | List the App Service sites in the subscription, or in one resource group. Parameters: `resourceGroupName`, `includeSlots` (both optional). |
| `stopFunctionApp` | Stop a function app, so it runs no further executions. Parameters: `resourceGroupName`, `functionAppName` (both required). |
| `startFunctionApp` | Start a stopped function app. Parameters: `resourceGroupName`, `functionAppName` (both required). |
| `listHostKeys` | Read an app's host-level keys: `masterKey`, `functionKeys`, and `systemKeys`. Parameters: `resourceGroupName`, `functionAppName` (both required). |
| `getFunction` | Get one function's configuration, including its trigger type and custom route. Parameters: `resourceGroupName`, `functionAppName`, `functionName` (all three required). |
| `listSyncFunctionTriggers` | Re-synchronize the app's trigger metadata with its deployed content and return the sync status. Parameters: `resourceGroupName`, `functionAppName` (both required). |

`listFunctions` and `listFunctionApps` follow Azure's pagination links and return every page. If a result set is larger than the connector retrieves in one call, the response includes `truncated: true`; narrow the query with `resourceGroupName` in that case.

`invoke` does not follow redirects. A function that answers with a 3xx returns that status and its `Location` header unchanged, so that the function key is never sent to another host.

::::{warning}
`listFunctionKeys` and `listHostKeys` return live credentials. The `masterKey` from `listHostKeys` grants administrative access to the whole app, so prefer `listFunctionKeys` when only one function is invoked.
::::

## Connector networking configuration [azure-functions-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [azure-functions-api-credentials]

To use the Azure Functions connector, you need to:

1. In the [Azure Portal](https://portal.azure.com/), go to **Microsoft Entra ID > App registrations** and create a new app registration (or reuse an existing one). Note its **Application (client) ID** and **Directory (tenant) ID**.
2. Under **Certificates & secrets**, create a new client secret and copy its value — it's only shown once.
3. Assign the app registration the **Reader** role on the subscription for read-only use: go to the subscription's **Access control (IAM) > Add role assignment**.
4. To restart, stop, or start an app, to re-sync triggers with `listSyncFunctionTriggers`, or to read keys with `listFunctionKeys` or `listHostKeys`, assign the **Website Contributor** role instead, either on the subscription or on each function app.
5. When configuring the connector, enter the subscription ID, the token URL (`https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`), the client ID, and the client secret.
