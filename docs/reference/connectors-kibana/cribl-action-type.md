---
navigation_title: "Cribl"
type: reference
description: "Use the Cribl connector to inspect and reshape Cribl telemetry pipelines — routes, pipelines, sources, and destinations."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Cribl connector [cribl-action-type]

The Cribl connector calls the [Cribl API](https://docs.cribl.io/api-reference/) on a Cribl Stream/Edge Leader (Cribl.Cloud, hybrid, or a customer-managed deployment). It exposes a generic `request` action for any API path, plus typed convenience actions for listing Worker Groups/Fleets and Worker Nodes, reading and replacing the routing table, committing and deploying configuration changes, managing pipelines/sources/destinations/lookups, restarting a Worker Group, and running Cribl Search queries. It authenticates with a Cribl API bearer token and can verify the server TLS certificate against a pasted PEM CA.

::::{warning}
This connector can perform any operation the configured token is authorized for, including replacing a Worker Group's entire routing table (`updateRoutes` deletes any route you don't include) and deploying configuration changes to live Worker Nodes. There are no additional restrictions in {{kib}}: access is governed entirely by the token's Cribl permissions. API credential management, local user accounts, RBAC, and the secrets/certificate stores are blocked on the `request` action.
::::

## Create connectors in {{kib}} [define-cribl-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [cribl-connector-configuration]

Cribl connectors have the following configuration properties:

Leader URL
:   The base URL of the Cribl Leader — your Cribl.Cloud organization URL (for example `https://main-yourworkspace-yourorg.cribl.cloud`) or your customer-managed Leader's URL (for example `https://leader.example.com:9000`), with no trailing slash. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

### Authentication [cribl-connector-authentication]

**API token**

Bearer token
:   A Cribl API bearer token (a JSON Web Token). The connector sends it in the `Authorization: Bearer <token>` header. On Cribl.Cloud/hybrid, tokens are valid for 24 hours; on a customer-managed deployment they expire according to the Leader's "Auth token TTL" setting (default 1 hour). This connector does not refresh the token automatically — an administrator must obtain a new one and update the connector before it expires.

Server CA certificate (PEM)
:   Optional PEM-encoded certificate authority used to verify the Leader's certificate, if it presents a private or self-signed certificate. Leave empty to rely on the system trust store.

## Test connectors [cribl-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test lists Worker Groups (`GET /api/v1/master/groups`) to verify connectivity and that the token is valid.

## Connector actions [cribl-connector-actions]

The Cribl connector has the following actions:

`request`
:   Make an authenticated request to any Cribl API path (relative to `/api/v1`). Prefer the typed actions below when they fit. API credential management, user accounts, RBAC, and the secrets/certificate stores are blocked.
    - `method` (required): One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
    - `path` (required): The API path relative to `/api/v1`, for example `/master/groups` or `/m/myGroup/system/inputs`.
    - `query` (optional): Query parameters.
    - `body` (optional): Request body for `POST`/`PUT`/`PATCH`.

`listWorkerGroups`
:   List Worker Groups (Stream) and Edge Fleets, with node counts and deployed config version. Optional `product` filter (`stream` or `edge`).

`listWorkers`
:   List Worker Nodes and Edge Nodes, with group, connection status, version, and CPU/memory utilization.

`getHealth`
:   Check the health status, version, and build of the Leader.

`listRoutes`
:   Read the routing table for a Worker Group/Fleet (`groupName`, optional `routeId`, default `default`).

`updateRoutes`
:   Replace the routing table for a Worker Group/Fleet (`groupName`, optional `routeId`, `routes`). This is a **full replace** — always call `listRoutes` first and pass back the complete modified array; any route you omit is deleted.

`commitConfig`
:   Git-commit pending configuration changes on the Leader (`message`, optional `group`, `effective`). Returns a commit hash to pass to `deployGroup`.

`deployGroup`
:   Deploy a committed configuration version to a Worker Group/Fleet (`groupName`, `version`).

`listPipelines`
:   List the pipelines configured for a Worker Group/Fleet (`groupName`).

`getPipeline`
:   Read a single pipeline's configuration (`groupName`, `pipelineId`).

`updatePipeline`
:   Reconfigure a pipeline, for example to sample or drop data, or disable one of its functions (`groupName`, `pipelineId`, `conf`). Automatically fetches the current pipeline and merges your changes into it, since Cribl's PATCH endpoint requires the complete resource. Cribl pipelines have no whole-pipeline "disabled" flag — use `updateRoutes` to stop a pipeline from processing data entirely.

`listSources`
:   List the Sources (data inputs) configured for a Worker Group/Fleet (`groupName`).

`updateSource`
:   Reconfigure, stop, or resume a Source (`groupName`, `sourceId`, optional `disabled`, `conf`). Automatically fetches the current Source and merges your changes into it, since Cribl's PATCH endpoint requires the complete resource.

`listDestinations`
:   List the Destinations (data outputs) configured for a Worker Group/Fleet (`groupName`).

`updateDestination`
:   Reconfigure, pause, or resume a Destination (`groupName`, `destinationId`, optional `disabled`, `conf`). Automatically fetches the current Destination and merges your changes into it, since Cribl's PATCH endpoint requires the complete resource.

`restartWorkerGroup`
:   Restart the Worker Processes in a Worker Group/Fleet (`groupName`). Only needed for customer-managed (on-prem) deployments to apply changes that require a full process restart.

`runSearch`
:   Submit a Cribl Search query (`query`, optional `groupName`, `earliest`, `latest`, `sampleRate`). The query must start with the `cribl` operator. `groupName` defaults to `default_search` and only needs to be set if the deployment has additional Search groups. Returns a job id.

`getSearchResults`
:   Read results for a search job started by `runSearch` (`jobId`, optional `groupName`, `limit`, `offset` for pagination). `groupName` must match the group passed to `runSearch` and defaults to `default_search`. Output is capped to stay within an agent-safe context size.

`updateLookup`
:   Create a new lookup file, or replace the contents of an existing one, used for data enrichment (`groupName`, `lookupId`, `content`, optional `contentType`, default `text/csv`).

## Commit and deploy lifecycle

Every write action (`updateRoutes`, `updatePipeline`, `updateSource`, `updateDestination`, `updateLookup`) only stages a pending change — it is not live until you commit and deploy it:

1. Make the change.
2. Call `commitConfig` with `group` set to the Worker Group/Fleet id, to commit its pending changes.
3. Call `deployGroup` with the commit hash from step 2, to push the change to Worker Nodes.
4. In distributed deployments, call `commitConfig` again (without `group`) to keep the Leader in sync with the Worker Group.
5. On customer-managed (on-prem) deployments only, call `restartWorkerGroup` if the change requires a process restart to take effect.

## Connector networking configuration [cribl-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. Make sure the Leader URL is permitted by `xpack.actions.allowedHosts`.

## Get API credentials [cribl-api-credentials]

Obtain a Cribl API bearer token for the connector:

**Cribl.Cloud or hybrid**

1. In Cribl.Cloud, go to **Organization > API Credentials** and create an API Credential (as an Owner or Admin). This returns a Client ID and Client Secret.
2. Exchange them for a bearer token: `POST https://login.cribl.cloud/oauth/token` with the Client ID and Client Secret in the request body. The response's `access_token` is valid for 24 hours.
3. Enter the Leader URL and the bearer token when configuring the connector in {{kib}}.

**Customer-managed (on-prem) deployment**

1. Call `POST https://${hostname}:${port}/api/v1/auth/login` with an admin username and password. The response's `token` field is the bearer token.
2. Tokens expire according to the Leader's **Settings > Global > General Settings > API Server Settings > Advanced > Auth token TTL** setting (default 3600 seconds).
3. Enter the Leader URL, the bearer token, and (if the Leader presents a private CA) its PEM certificate when configuring the connector in {{kib}}.

Because tokens expire, plan to periodically regenerate the token and update the connector — this connector does not refresh it automatically.
