---
navigation_title: "Amazon EKS"
type: reference
description: "Use the Amazon EKS connector to discover EKS clusters and node groups, scale node groups, manage cluster access entries and policies, and mint short-lived Kubernetes tokens for the Kubernetes connector."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Amazon EKS connector [aws-eks-action-type]

The Amazon EKS connector gives a workflow or agent the AWS control-plane side of managed Kubernetes: it discovers clusters, reads cluster and node group state, scales node groups to add or drain capacity, manages who can reach a cluster through EKS access entries and access policies, and mints the short-lived Kubernetes bearer token that EKS requires so a later step can act on the cluster's Kubernetes API without an interactive `aws eks get-token`.

It does not touch workloads. Pods, deployments, logs, and `kubectl`-style apply, scale, and rollout belong to the [Kubernetes connector](/reference/connectors-kibana/kubernetes-action-type.md), which accepts the same AWS access key through its **Amazon EKS** authentication type. The `getCluster` action returns the endpoint and CA certificate that connector needs.

## Overview

The connector calls the [Amazon EKS API](https://docs.aws.amazon.com/eks/latest/APIReference/Welcome.html) in the configured Region, signing every request with AWS Signature Version 4 using the access key you provide. `getToken` additionally presigns an AWS STS `GetCallerIdentity` request with the same key, which is how EKS bearer tokens work.

Node group and cluster configuration changes are asynchronous updates. Poll `describeUpdate` with the returned update ID until `done` is true, then check `succeeded` and `errors`. Access entry and policy changes apply immediately.

Access entry management (`createAccessEntry`, `updateAccessEntry`, `deleteAccessEntry`, `associateAccessPolicy`, `disassociateAccessPolicy`) and `getToken` are available as workflow steps only, not as autonomous agent tools, because they grant cluster access or return a live credential.

## Create connectors in {{kib}} [define-aws-eks-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-eks-connector-configuration]

Amazon EKS connectors have the following configuration properties:

AWS Region
:   The AWS Region the clusters live in, for example `us-east-1`. Every action can override it with a `region` parameter.

### Authentication [aws-eks-connector-authentication]

**AWS credentials**

Access Key ID
:   The AWS IAM access key ID used to sign every request with Signature Version 4 (SigV4) and to presign cluster tokens.

Secret Access Key
:   The AWS IAM secret access key paired with the access key ID above.

## Test connectors [aws-eks-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the EKS `ListClusters` API in the configured Region to verify connectivity and that the credentials can authenticate.

## Connector actions [aws-eks-connector-actions]

Every action accepts an optional `region` that overrides the connector setting.

### Discovery and cluster access

`listClusters`
:   Lists the cluster names in a Region. Parameters: `maxResults`, `nextToken`, `includeConnectedClusters`.

`getCluster`
:   Describes a cluster: status, Kubernetes and platform version, API server endpoint, CA certificate, authentication mode, enabled control-plane log types, VPC and endpoint access settings, health issues, and tags. Also returns `kubernetesConnector` with the API URL and PEM CA certificate for wiring the Kubernetes connector to the cluster. Parameters: `clusterName`.

`getToken`
:   Mints a short-lived Kubernetes bearer token for the cluster and, by default, returns the endpoint and CA certificate with it, ready for a step that calls the Kubernetes API. Tokens are valid for about 15 minutes. The connector's IAM identity must already have an access entry on the cluster. Parameters: `clusterName`, `includeClusterDetails`. Workflow steps only.

### Node groups

`listNodegroups`
:   Lists the managed node group names of a cluster. Parameters: `clusterName`, `maxResults`, `nextToken`.

`describeNodegroup`
:   Describes a managed node group: status, scaling configuration (`minSize`, `maxSize`, `desiredSize`), capacity type, instance types, AMI type, version, labels, taints, update strategy, node repair, Auto Scaling groups, and health issues. Parameters: `clusterName`, `nodegroupName`.

`updateNodegroupConfig`
:   Scales a node group or changes its labels, taints, rolling-update settings, or node auto repair. Parameters: `clusterName`, `nodegroupName`, and at least one of `minSize`, `maxSize`, `desiredSize`, `labelsToAdd`, `labelsToRemove`, `taintsToAdd`, `taintsToRemove`, `maxUnavailable`, `maxUnavailablePercentage`, `updateStrategy`, `nodeRepairEnabled`. Returns an update to poll.

### Updates

`describeUpdate`
:   Gets the status of an asynchronous update: status, a `done` flag, `succeeded`, the changed parameters, and errors. Parameters: `clusterName`, `updateId`, and `nodegroupName` for node group updates.

`listUpdates`
:   Lists update IDs for a cluster or, with `nodegroupName`, for one node group. Parameters: `clusterName`, `nodegroupName`, `maxResults`, `nextToken`.

### Cluster configuration and tags

`updateClusterConfig`
:   Changes control-plane settings: `enableLogTypes` and `disableLogTypes`, `authenticationMode` (forward only: `CONFIG_MAP` to `API_AND_CONFIG_MAP` to `API`), `endpointPublicAccess`, `endpointPrivateAccess`, `publicAccessCidrs`, `supportType`, `deletionProtection`. Change one category per call. Returns an update to poll.

`listTagsForResource`
:   Reads the AWS tags on a cluster or node group. Parameters: `resourceArn`.

### Access entries and policies

`listAccessPolicies`
:   Lists the EKS-managed access policies and their ARNs, such as `AmazonEKSClusterAdminPolicy`, `AmazonEKSAdminPolicy`, `AmazonEKSEditPolicy`, and `AmazonEKSViewPolicy`.

`listAccessEntries`
:   Lists the IAM principal ARNs that have an access entry on a cluster. Parameters: `clusterName`, `associatedPolicyArn`, `maxResults`, `nextToken`.

`describeAccessEntry`
:   Describes one principal's access entry: type, Kubernetes username and groups, and tags. Parameters: `clusterName`, `principalArn`.

`listAssociatedAccessPolicies`
:   Lists the access policies bound to a principal's access entry with their scope. Parameters: `clusterName`, `principalArn`.

`createAccessEntry`
:   Creates an access entry so an IAM user or role can authenticate to the cluster. Parameters: `clusterName`, `principalArn`, and optional `kubernetesGroups`, `username`, `type`, `tags`. Workflow steps only.

`updateAccessEntry`
:   Replaces the Kubernetes groups or username of an access entry. Parameters: `clusterName`, `principalArn`, and `kubernetesGroups` or `username`. Workflow steps only.

`deleteAccessEntry`
:   Deletes an access entry, revoking the principal's cluster access. Parameters: `clusterName`, `principalArn`. Workflow steps only.

`associateAccessPolicy`
:   Binds an access policy to an access entry, cluster-wide or scoped to namespaces. Parameters: `clusterName`, `principalArn`, `policyArn`, `accessScopeType`, `namespaces`. Workflow steps only.

`disassociateAccessPolicy`
:   Removes an access policy from an access entry. Parameters: `clusterName`, `principalArn`, `policyArn`. Workflow steps only.

## Usage notes [aws-eks-usage-notes]

* Node group sizes are totals across the group's subnets, not per zone. `desiredSize` must stay within `minSize` and `maxSize`, so widen `maxSize` in the same call when scaling past the current maximum. If the Cluster Autoscaler or Karpenter manages the group, change the bounds instead of `desiredSize`.
* Updates are slow. Node group scaling takes 1 to 5 minutes; control-plane changes such as logging or endpoint access take 5 to 25 minutes. Do not wait for an update inside a single step: keep the update ID and poll `describeUpdate` from later steps, with a wait between polls, so the calling agent turn or workflow step does not time out. EKS runs one update per node group and one cluster-level update at a time.
* To let the connector's IAM identity (or any other principal) reach the Kubernetes API, create an access entry with `createAccessEntry`, then bind a policy with `associateAccessPolicy`. Access entries require the cluster authentication mode `API` or `API_AND_CONFIG_MAP`.
* To manage workloads from {{kib}}, create a Kubernetes connector with the **Amazon EKS** authentication type, the same access key, the Region and cluster name, and the `kubernetesConnector.apiUrl` and `caCertificatePem` returned by `getCluster`. That connector mints its own token on every call, so `getToken` is only needed when another system consumes the token.
* `updateAccessEntry` replaces the Kubernetes group list and `updateClusterConfig` replaces the public CIDR allowlist. Read the current values first and include everything you want to keep.

## Connector networking configuration [aws-eks-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-eks-api-credentials]

1. Sign in to the [AWS IAM console](https://console.aws.amazon.com/iam/).
2. Create (or choose) an IAM user or role dedicated to this connector.
3. Attach a policy granting at least the following actions, scoped to the clusters you want the connector to manage:
   - `eks:ListClusters`, `eks:DescribeCluster`, `eks:ListNodegroups`, `eks:DescribeNodegroup`, `eks:DescribeUpdate`, `eks:ListUpdates`, `eks:ListTagsForResource`, `eks:ListAccessPolicies`, `eks:ListAccessEntries`, `eks:DescribeAccessEntry`, `eks:ListAssociatedAccessPolicies` for the read actions
   - `eks:UpdateNodegroupConfig` and `eks:UpdateClusterConfig` for scaling and configuration changes
   - `eks:CreateAccessEntry`, `eks:UpdateAccessEntry`, `eks:DeleteAccessEntry`, `eks:AssociateAccessPolicy`, `eks:DisassociateAccessPolicy` for access management
   - `sts:GetCallerIdentity` is implied for `getToken`; no extra IAM permission is needed, but the identity must have an access entry on the cluster for the token to be accepted.
4. Create an access key for that user (**Security credentials** → **Access keys** → **Create access key**).
5. Copy the **Access key ID** and **Secret access key**, and enter them along with the AWS Region when configuring the connector in {{kib}}.
