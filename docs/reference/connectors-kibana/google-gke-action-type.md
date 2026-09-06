---
navigation_title: "Google Kubernetes Engine"
type: reference
description: "Use the Google Kubernetes Engine connector to list GKE clusters and node pools, scale and autoscale node pools, upgrade and roll back, harden cluster policy, and track the resulting operations."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google Kubernetes Engine connector [google-gke-action-type]

The Google Kubernetes Engine (GKE) connector lets a workflow or agent operate the managed infrastructure around a GKE cluster without an SRE running `gcloud` by hand. It discovers clusters and node pools, scales and autoscales node pools, upgrades and rolls back, toggles network and security policy, provisions and tears down clusters, and tracks the asynchronous operation every change returns.

It does not touch workloads. Pods, deployments, logs, and `kubectl`-style apply, scale, and rollout belong to the [Kubernetes connector](/reference/connectors-kibana/kubernetes-action-type.md). The `getCluster` action returns the API server endpoint and CA certificate that connector needs, and the same service account key authenticates there through its GKE authentication type.

## Overview

The connector calls the [Kubernetes Engine API](https://cloud.google.com/kubernetes-engine/docs/reference/rest) (`container.googleapis.com`). You upload a service account JSON key when creating the connector, and every action runs as that service account using a short-lived access token the connector mints for each request.

Every mutating action returns an operation rather than the finished resource. Poll `getOperation` until `done` is true, then check `error`. GKE runs one operation per cluster at a time, so a second change on a busy cluster fails until the first completes.

Cluster provisioning (`createCluster`) and deletion (`deleteCluster`) are available as workflow steps only, not as autonomous agent tools, and `deleteCluster` additionally requires the cluster name to be repeated as a confirmation.

## Create connectors in {{kib}} [define-google-gke-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-gke-connector-configuration]

Google Kubernetes Engine connectors have the following configuration properties:

Service account JSON key
:   The JSON key file for the service account the connector authenticates as. Stored encrypted. Required.

Default project ID
:   Optional. The Google Cloud project used when an action does not specify one, for example `my-project-123`. Defaults to the project the service account key belongs to. An action that passes an explicit project ID always takes precedence.

Default location
:   Optional. The zone (for example `us-central1-a`) or region (for example `us-central1`) used when an action does not specify one. Leave it empty to list across every location and require a location on cluster actions.

## Connector actions [google-gke-connector-actions]

Every cluster action accepts an optional `projectId` and a `location` (the zone of a zonal cluster or the region of a regional cluster) plus `clusterId`. Take `location` and `clusterId` from the `listClusters` result.

### Discovery

`listClusters`
:   Lists the clusters in a project, across every location by default (`location` `-`) or in one zone or region. Returns name, location, status, versions, node count, release channel, whether the cluster is Autopilot, and the endpoint.

`getCluster`
:   Gets one cluster in full: status and conditions, control-plane and node versions, node pools with sizes and autoscaling, network policy, authorized networks, Binary Authorization, release channel, endpoints, and the `etag`. Also returns `kubernetesConnector` with the API server URL and PEM CA certificate for wiring the Kubernetes connector to the cluster.

`listNodePools`
:   Lists the node pools of a cluster with status, version, per-zone and total node count, machine type, autoscaling bounds, and management settings.

`getNodePool`
:   Gets one node pool: status, version, node count and zones, machine and disk configuration, labels and taints, autoscaling, auto-repair and auto-upgrade, upgrade settings, and `etag`.

`getServerConfig`
:   Gets the GKE versions and image types available in a location, overall and per release channel. Call it before `updateCluster` or `createCluster` so the requested version is one GKE accepts.

### Operations

`getOperation`
:   Gets the status of an operation returned by any mutating action: status, a `done` flag, the error if it failed, progress metrics, and cluster and node pool conditions. Parameters: `location`, `operationId`.

`listOperations`
:   Lists recent and in-flight operations in a project, across every location by default.

`cancelOperation`
:   Cancels an in-progress node upgrade operation (`UPGRADE_NODES`). GKE rejects cancellation of other operation types. The operation ends with an "aborted" error. Use `rollbackNodePoolUpgrade` to revert nodes that already moved.

### Node pools

`setNodePoolSize`
:   Scales a node pool to an exact per-zone node count (`nodeCount`). Use `0` to drain a pool without deleting it. On an autoscaled pool the autoscaler might resize it again.

`setNodePoolAutoscaling`
:   Turns autoscaling on, adjusts its bounds, or turns it off. Parameters: `enabled`, and either per-zone bounds (`minNodeCount`, `maxNodeCount`) or cluster-wide bounds (`totalMinNodeCount`, `totalMaxNodeCount`), plus an optional `locationPolicy`.

`setNodePoolManagement`
:   Turns node `autoRepair` and `autoUpgrade` on or off. Omitted flags keep their current value.

`rollbackNodePoolUpgrade`
:   Rolls back a node pool whose upgrade was aborted or failed. Optional `respectPdb`.

`createNodePool`
:   Adds a node pool to a Standard cluster. Parameters: `nodePoolId`, `initialNodeCount`, and optional `machineType`, `diskSizeGb`, `diskType`, `imageType`, `spot`, `version`, `locations`, `labels`, `taints`, `serviceAccount`, `resourceManagerTags`, `autoscaling`, `autoRepair`, `autoUpgrade`, `maxSurge`, `maxUnavailable`.

`deleteNodePool`
:   Deletes a node pool. GKE cordons and drains its nodes first.

### Cluster configuration

`updateCluster`
:   Updates cluster configuration or version: `desiredMasterVersion`, `desiredNodeVersion` with `desiredNodePoolId`, `desiredImageType`, `desiredLocations`, `desiredReleaseChannel`, `desiredMonitoringService`, `desiredLoggingService`, and an optional `etag`. At least one change is required.

`setNetworkPolicy`
:   Turns Kubernetes NetworkPolicy enforcement (Calico) on or off for a Standard cluster. GKE applies this in two steps (the cluster addon, then the nodes), each a node-recreating operation. Every call performs the next outstanding step and returns its operation with a `phase` of `addon`, `nodes`, or `done`. Poll the operation and call the action again until it reports `done`.

`setBinaryAuthorization`
:   Sets the Binary Authorization `evaluationMode` to `PROJECT_SINGLETON_POLICY_ENFORCE` or `DISABLED`.

`setMasterAuthorizedNetworks`
:   Restricts control-plane access to a list of IPv4 `cidrBlocks`, or lifts the restriction. The list replaces the current allowlist, so read it from `getCluster` first and include every range to keep.

### Cluster lifecycle

`createCluster`
:   Provisions an Autopilot cluster, or a Standard cluster with one default node pool. Parameters: `location`, `clusterId`, and optional `autopilot`, `initialNodeCount`, `machineType`, `diskSizeGb`, `nodeLocations`, `initialClusterVersion`, `releaseChannel`, `network`, `subnetwork`, `enableWorkloadIdentity`, `enableNetworkPolicy`, `resourceLabels`, `resourceManagerTags`. Workflow steps only.

`deleteCluster`
:   Deletes a cluster and everything running in it. Requires `confirmClusterId` to equal `clusterId`. Workflow steps only.

## Usage notes [google-gke-usage-notes]

* Node counts (`nodeCount`, `initialNodeCount`, `minNodeCount`, `maxNodeCount`) are per zone. A regional node pool spanning three zones with `nodeCount` 2 runs six nodes. Use `totalMinNodeCount` and `totalMaxNodeCount` for cluster-wide autoscaler bounds.
* Autopilot clusters have GKE-managed node pools. Node pool actions do not apply to them.
* Operations are slow. Node pool resizes take a few minutes; upgrades, rollbacks, logging or monitoring changes, Binary Authorization changes, and network policy steps re-create nodes and take 5 to 15 minutes; cluster creation takes 5 to 15 minutes. Do not wait for an operation inside a single step: keep the returned operation ID and poll `getOperation` from later steps, with a wait between polls, so the calling agent turn or workflow step does not time out.
* `updateCluster` changes the logging and monitoring services together, as GKE requires. When you pass only one, the connector reads the other from the cluster and sends it back unchanged.
* A safe upgrade reads `getServerConfig`, upgrades the control plane with `updateCluster` and `desiredMasterVersion`, polls the operation, then upgrades each node pool with `desiredNodeVersion` and `desiredNodePoolId`. If a node upgrade fails, `rollbackNodePoolUpgrade` reverts the nodes that already moved.
* `autoUpgrade` cannot be turned off on clusters enrolled in a release channel. Leave the channel first with `updateCluster` and `desiredReleaseChannel: "UNSPECIFIED"`.
* Organizations that enforce tagging on Compute Engine instances can pass `resourceManagerTags` to `createCluster` and `createNodePool`; without the required tags node creation is denied by the organization policy and the operation ends in an error.
* To manage workloads in a cluster, call `getCluster`, then create a Kubernetes connector with the returned `kubernetesConnector.apiUrl`, the **Google Kubernetes Engine (GKE)** authentication type, the same service account JSON key, and `caCertificatePem` as the cluster CA certificate.

## Connector networking configuration [google-gke-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-gke-api-credentials]

To use the Google Kubernetes Engine connector you need a Google Cloud service account and a JSON key for it:

1. In the Google Cloud console, open **IAM & Admin → Service Accounts** and either pick an existing service account or create one for the connector.
2. Grant the service account a role on the project. **Kubernetes Engine Cluster Admin** (`roles/container.clusterAdmin`) covers every action in this connector. For a read-only connector, **Kubernetes Engine Cluster Viewer** (`roles/container.clusterViewer`) is enough for `listClusters`, `getCluster`, `listNodePools`, `getNodePool`, `getServerConfig`, `getOperation`, and `listOperations`.
3. To use `createCluster` or `createNodePool`, also grant the connector's service account the **Service Account User** role (`roles/iam.serviceAccountUser`) on the service account the nodes run as (by default the Compute Engine default service account, `PROJECT_NUMBER-compute@developer.gserviceaccount.com`). Without it GKE rejects node creation with "The user does not have access to service account".
4. On the service account's **Keys** tab, choose **Add key → Create new key**, select **JSON**, and download the file.
5. Enable the **Kubernetes Engine API** on the project.
6. When you create the connector in {{kib}}, upload the JSON key file as the service account key.

The connector requests the `https://www.googleapis.com/auth/cloud-platform` OAuth scope when it exchanges the key for an access token.
