---
navigation_title: "Argo CD"
type: reference
description: "Use the Argo CD connector to manage GitOps applications — sync, inspect health and resources, and diagnose failed deploys."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Argo CD connector [argocd-action-type]

The Argo CD connector calls the [Argo CD API](https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/) to manage GitOps applications. It exposes a generic `request` action for any API path, plus typed convenience actions for listing and inspecting applications, syncing, reading resource trees and events, fetching pod logs, and listing clusters and projects. It authenticates with an Argo CD API bearer token and can verify the server TLS certificate against a pasted PEM CA.

This connector is complementary to the [Kubernetes connector](/reference/connectors-kibana/kubernetes-action-type.md): use Argo CD for desired-versus-live GitOps lifecycle, and Kubernetes for direct cluster API operations.

::::{warning}
This connector can perform any operation the configured token is authorized for, including syncing applications (and pruning resources when `prune` is enabled). There are no additional restrictions in {{kib}}: access is governed entirely by the token's Argo CD [RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/). Prefer a project-scoped token with least-privilege permissions.
::::

## Create connectors in {{kib}} [define-argocd-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [argocd-connector-configuration]

Argo CD connectors have the following configuration properties:

API server URL
:   The base URL of the Argo CD API server, for example `https://argocd.example.com`. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

### Authentication [argocd-connector-authentication]

**API token**

Token
:   A long-lived Argo CD API token (local account token or project role token). The connector sends it in the `Authorization: Bearer <token>` header. Do **not** paste short-lived session JWTs from `POST /api/v1/session` — those expire quickly and force you to recreate or re-edit the connector.

Server CA certificate (PEM)
:   Optional PEM-encoded certificate authority used to verify the Argo CD server certificate. Leave empty to rely on the system trust store or to disable verification.

Verification mode
:   How to verify the server TLS certificate: `full` (verify certificate and hostname, the default), `certificate` (verify certificate only), or `none` (disable verification, not recommended).

## Test connectors [argocd-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test requests userinfo (`GET /api/v1/session/userinfo`) to verify connectivity and authentication.

The Argo CD connector has the following actions:

`request`
:   Make an authenticated request to any Argo CD API path. Prefer the typed actions below when they fit. Streaming and secrets-heavy write endpoints are blocked.
    - `method` (required): One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
    - `path` (required): The API path, for example `/api/v1/applications`.
    - `query` (optional): Query parameters.
    - `body` (optional): Request body for `POST`/`PUT`/`PATCH`.

`listApplications`
:   List applications with optional filters (`projects`, `project`, `selector`, `name`, `repo`, `appNamespace`). Returns a slim summary per item.

`getApplication`
:   Get a single application by `name` (optional `project`, `appNamespace`, `refresh`). History is capped; oversized sync results are condensed.

`getResourceTree`
:   Get the resource tree for an application — health and sync state per managed object.

`listApplicationEvents`
:   List Kubernetes events related to an application (optional resource filters).

`getPodLogs`
:   Retrieve logs for a pod managed by an application (`name`, `podName`, optional `namespace`, `container`, `tailLines`, `sinceSeconds`). Output is capped.

`syncApplication`
:   Sync an application (`name`, optional `revision`, `prune` default `false`, `dryRun`, `project`, `syncOptions`, `resources`, `strategy`). Prefer `dryRun: true` before a real sync.

`listClusters`
:   List clusters registered with Argo CD. Credential fields are scrubbed from the response.

`getProject`
:   Get an AppProject by `name`. Defaults to the detailed endpoint.

## Connector networking configuration [argocd-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. Make sure the API server URL is permitted by `xpack.actions.allowedHosts`.

## Get API credentials [argocd-api-credentials]

Use a **permanent** Argo CD API token — either a local account token or a project role token. Do not store session JWTs from username/password login; they expire and are unsuitable for connectors.

1. Enable `apiKey` on a local account in `argocd-cm` (for example `accounts.admin: apiKey, login` or a dedicated `accounts.kibana: apiKey`), then restart the Argo CD server components if needed.
2. Generate a non-expiring account token:
   - CLI: `argocd account generate-token --account <name>`
   - API: `POST /api/v1/account/{name}/token` with body `{"id":"kibana-connector","expiresIn":0}` (authenticate once with a session only to mint the token; discard the session afterward).
3. Or create a project-scoped role token (`POST /api/v1/projects/{project}/roles/{role}/token`) for least privilege.
4. If Argo CD uses a private CA, retrieve the server CA certificate as PEM.
5. Enter the API server URL, the permanent token, and optional CA certificate when configuring the connector in {{kib}}.
