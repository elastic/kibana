---
navigation_title: "Kubernetes"
type: reference
description: "Use the Kubernetes connector to read and modify resources in a Kubernetes cluster through its REST API."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Kubernetes connector [kubernetes-action-type]

The Kubernetes connector calls the [Kubernetes API](https://kubernetes.io/docs/reference/using-api/) to read and modify resources in a cluster. It exposes a generic `request` action for any API path, plus typed convenience actions for common operations. It authenticates with a service account bearer token or with cloud provider credentials for managed clusters (GKE, Amazon EKS, AKS), and verifies the API server TLS certificate against the cluster CA.

::::{warning}
This connector can perform any operation the configured service account is authorized for, including deleting resources. There are no additional restrictions in {{kib}}: access is governed entirely by the token's Kubernetes [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/). Use a service account with least-privilege permissions scoped to what the connector actually needs.
::::

## Create connectors in {{kib}} [define-kubernetes-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [kubernetes-connector-configuration]

Kubernetes connectors have the following configuration properties:

API server URL
:   The base URL of the Kubernetes API server, for example `https://my-cluster.example.com:6443`. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

### Authentication [kubernetes-connector-authentication]

The connector supports four authentication methods. All of them share two optional TLS settings:

Cluster CA certificate (PEM)
:   Optional PEM-encoded certificate authority used to verify the API server certificate. Leave empty to rely on the system trust store or to disable verification.

Verification mode
:   How to verify the API server TLS certificate: `full` (verify certificate and hostname, the default), `certificate` (verify certificate only), or `none` (disable verification, not recommended).

**Service account token**

Token
:   A service account bearer token. The connector sends it in the `Authorization: Bearer <token>` header. This works with any Kubernetes cluster, but the token is a long-lived credential you must rotate yourself.

**Google Kubernetes Engine (GKE)**

GCP service account key (JSON)
:   The JSON key of a GCP service account. The connector exchanges it for short-lived (one hour) OAuth2 access tokens, which GKE accepts directly as Kubernetes bearer tokens. No long-lived cluster token is ever created.

Grant the service account access to the cluster with a Cloud IAM role such as **Kubernetes Engine Viewer** (`roles/container.viewer`) for read-only use or **Kubernetes Engine Developer** (`roles/container.developer`) for read-write use. For finer-grained access, grant `roles/container.clusterViewer` and bind in-cluster RBAC roles to the service account's email address.

**Amazon EKS**

Access key ID / Secret access key
:   Credentials of an IAM principal. The connector mints short-lived bearer tokens locally by presigning an STS `GetCallerIdentity` request (the same mechanism as `aws eks get-token`); tokens are valid for at most 15 minutes and a fresh one is minted for every action execution.

AWS region
:   The region the EKS cluster runs in, for example `us-east-1`.

EKS cluster name
:   The cluster name as shown in AWS. Tokens are cryptographically bound to this name.

Grant the IAM principal access to the cluster with an [EKS access entry](https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html), for example:

```sh
aws eks create-access-entry --cluster-name <cluster> --principal-arn <iam-principal-arn>
aws eks associate-access-policy --cluster-name <cluster> --principal-arn <iam-principal-arn> \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy --access-scope type=cluster
```

Use `AmazonEKSViewPolicy` for read-only access or `AmazonEKSEditPolicy` for read-write access; both can also be scoped to specific namespaces.

**Azure Kubernetes Service (AKS)**

Tenant ID / Client ID / Client secret
:   Credentials of a Microsoft Entra ID service principal. The connector runs the OAuth2 client credentials flow against Entra ID and uses the resulting token (valid for roughly an hour, cached and refreshed automatically) as the Kubernetes bearer token. Requires an AKS cluster with [Microsoft Entra ID integration](https://learn.microsoft.com/en-us/azure/aks/enable-authentication-microsoft-entra-id).

Grant the service principal access with [Azure RBAC for Kubernetes](https://learn.microsoft.com/en-us/azure/aks/manage-azure-rbac), for example:

```sh
az role assignment create --role "Azure Kubernetes Service RBAC Reader" \
  --assignee <client-id> --scope <aks-cluster-resource-id>
```

Use the `RBAC Reader`, `RBAC Writer`, or `RBAC Admin` built-in roles depending on the required access, or bind in-cluster RBAC roles to the service principal's object ID instead.

## Test connectors [kubernetes-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test requests the API server version (`GET /version`) to verify connectivity and authentication.

The Kubernetes connector has the following actions:

`request`
:   Make an authenticated request to any Kubernetes API path. This is the flexible escape hatch; prefer the typed actions below when they fit.
    - `method` (required): One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
    - `path` (required): The API path, for example `/api/v1/namespaces/default/pods`.
    - `query` (optional): Query parameters, for example `{ "labelSelector": "app=nginx" }`.
    - `body` (optional): Request body for `POST`/`PUT`/`PATCH`.
    - `contentType` (optional): Content-Type override. `PATCH` defaults to `application/strategic-merge-patch+json`.

`listResources`
:   List resources of a given type, returning a compact summary per item.
    - `apiVersion` (required): For example `v1` or `apps/v1`.
    - `resource` (required): The lowercase plural resource name, for example `pods` or `deployments`.
    - `namespace` (optional): Omit to list across all namespaces or for cluster-scoped resources.
    - `labelSelector`, `fieldSelector`, `limit` (optional): Filtering and paging.

`getResource`
:   Retrieve the full manifest of a single resource by name (`apiVersion`, `resource`, `name`, and optional `namespace`).

`listNamespaces`
:   List all namespaces in the cluster.

`getPodLogs`
:   Retrieve logs for a pod, optionally for a specific `container`. Output is capped to stay within context limits (`namespace`, `name`, `container`, `previous`, `tailLines`, `sinceSeconds`).

`listEvents`
:   List recent cluster events, optionally scoped to a `namespace`. Useful for diagnosing scheduling and startup failures.

`createResource`
:   Create a new resource from a manifest (`apiVersion`, `resource`, optional `namespace`, `manifest`, optional `dryRun`).

`applyResource`
:   Create or update a resource using [server-side apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/) (`apiVersion`, `resource`, `name`, optional `namespace`, `manifest`, `fieldManager`, `force`, `dryRun`).

`patchResource`
:   Apply a partial update using `strategic` (default), `merge`, or `json` patch strategies (`apiVersion`, `resource`, `name`, optional `namespace`, `patch`, `patchType`, `dryRun`).

`deleteResource`
:   Delete a resource by name (`apiVersion`, `resource`, `name`, optional `namespace`, `dryRun`).

`scaleWorkload`
:   Scale a Deployment, StatefulSet, or ReplicaSet to a desired number of `replicas` (`resource`, `name`, `namespace`, `replicas`, `dryRun`).

All mutating actions accept `dryRun: true`, which sends `?dryRun=All` so the API server validates and processes the request without persisting anything. Use it to preview a change before applying it.

## Connector networking configuration [kubernetes-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations. Because Kubernetes API servers are often reachable only on private hostnames or IP addresses, make sure the API server URL is permitted by `xpack.actions.allowedHosts`.

## Get API credentials [kubernetes-api-credentials]

For managed clusters (GKE, EKS, AKS), use the cloud provider credentials described in [Authentication](#kubernetes-connector-authentication) instead of a cluster token. To use the **Service account token** method, create a service account and a scoped token:

1. Create a service account in the target namespace, for example `kubectl create serviceaccount kibana-connector -n <namespace>`.
2. Grant it least-privilege RBAC via a `Role`/`ClusterRole` and a `RoleBinding`/`ClusterRoleBinding` covering only the resources and verbs the connector should use.
3. Create a token for the service account, for example `kubectl create token kibana-connector -n <namespace>` (add `--duration` as needed).
4. Retrieve the cluster CA certificate (for example from your kubeconfig `certificate-authority-data`, base64-decoded to PEM) so the connector can verify the API server.
5. Enter the API server URL, token, and CA certificate when configuring the connector in {{kib}}.
