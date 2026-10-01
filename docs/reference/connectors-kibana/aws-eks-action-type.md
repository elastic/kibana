---
navigation_title: "Amazon EKS"
type: reference
description: "Use the Amazon EKS connector to discover EKS clusters and node groups, scale node groups, manage cluster access entries and policies, and mint short-lived Kubernetes tokens for the Kubernetes connector."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Amazon EKS connector [aws-eks-action-type]

The Amazon EKS connector gives an agent the AWS control-plane side of managed Kubernetes: it discovers clusters, reads cluster and node group state, scales node groups to add or drain capacity, and audits who can reach a cluster through EKS access entries and access policies. Through the connector execute API, it also manages access entries and mints the short-lived Kubernetes bearer token that EKS requires, without an interactive `aws eks get-token`.

This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.

It does not touch workloads. Pods, deployments, logs, and `kubectl`-style apply, scale, and rollout belong to the [Kubernetes connector](/reference/connectors-kibana/kubernetes-action-type.md), which accepts the same AWS access key through its **Amazon EKS** authentication type. The `getCluster` action returns the endpoint and CA certificate that connector needs.

## Overview

The connector calls the [Amazon EKS API](https://docs.aws.amazon.com/eks/latest/APIReference/Welcome.html) in the configured Region, signing every request with AWS Signature Version 4 using the access key you provide. `getToken` additionally presigns an AWS STS `GetCallerIdentity` request with the same key, which is how EKS bearer tokens work.

Node group and cluster configuration changes are asynchronous updates. Poll `describeUpdate` with the returned update ID, cluster name, and Region until `done` is true, then check `succeeded` and `errors`. Access entry and policy changes apply immediately.

Access entry management (`createAccessEntry`, `updateAccessEntry`, `deleteAccessEntry`, `associateAccessPolicy`, `disassociateAccessPolicy`), `updateClusterAccessConfig`, and `getToken` are not available to agents, because they grant cluster access, can lock clients out of the cluster, or return a live credential. You can call them only through the [connector execute API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute).

## Create connectors in {{kib}} [define-aws-eks-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-eks-connector-configuration]

Amazon EKS connectors have the following configuration properties:

AWS Region
:   The AWS Region the clusters live in, for example `us-east-1` or `us-gov-west-1`. Every action can override it with a `region` parameter. China and ISO Regions are not supported.

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
:   Describes a cluster: status, Kubernetes and platform version, API server endpoint, CA certificate, authentication mode, enabled control-plane log types, VPC and endpoint access settings, health issues, and tags. Also returns `kubernetesConnector` with the API URL and PEM CA certificate for wiring the Kubernetes connector to the cluster. Clusters registered through the EKS Connector have no endpoint, so `kubernetesConnector` is absent for them. When `vpc.endpointPublicAccess` is `false`, the endpoint is reachable only from inside the cluster's VPC. Parameters: `clusterName`.

`getToken`
:   Mints a short-lived Kubernetes bearer token for the cluster and, by default, returns the endpoint and CA certificate with it, ready for a call to the Kubernetes API. Tokens are reported as valid for 14 minutes, one minute less than EKS accepts them. The connector's IAM identity must already have an access entry on the cluster. Fails for a cluster without an API server endpoint. Parameters: `clusterName`, `includeClusterDetails`. Execute API only.

### Node groups

`listNodegroups`
:   Lists the managed node group names of a cluster. Parameters: `clusterName`, `maxResults`, `nextToken`.

`describeNodegroup`
:   Describes a managed node group: status, scaling configuration (`minSize`, `maxSize`, `desiredSize`), capacity type, instance types, AMI type, version, labels, taints, update strategy, node repair, Auto Scaling groups, and health issues. Parameters: `clusterName`, `nodegroupName`.

`updateNodegroupConfig`
:   Scales a node group or changes its labels, taints, rolling-update settings, or node auto repair. Parameters: `clusterName`, `nodegroupName`, and at least one of `minSize`, `maxSize`, `desiredSize`, `labelsToAdd`, `labelsToRemove`, `taintsToAdd`, `taintsToRemove`, `maxUnavailable`, `maxUnavailablePercentage`, `updateStrategy`, `nodeRepairEnabled`. Settings you omit keep their current values. Returns an update, with the cluster name and Region to poll it with.

### Updates

`describeUpdate`
:   Gets the status of an asynchronous update: status, a `done` flag, `succeeded`, the changed parameters, and errors. Parameters: `clusterName`, `updateId`, and `nodegroupName` for node group updates.

`listUpdates`
:   Lists update IDs for a cluster or, with `nodegroupName`, for one node group. Parameters: `clusterName`, `nodegroupName`, `maxResults`, `nextToken`.

### Cluster configuration and tags

`updateClusterConfig`
:   Changes one category of control-plane settings per call: control-plane logging (`enableLogTypes`, `disableLogTypes`), the upgrade policy (`supportType`), or `deletionProtection`. EKS rejects an update that mixes categories, so the connector does too. Returns an update, with the cluster name and Region to poll it with.

`updateClusterAccessConfig`
:   Changes how clients reach the cluster, one category per call: the authentication mode (`authenticationMode`, forward only: `CONFIG_MAP` to `API_AND_CONFIG_MAP` to `API`; switching to `API` disables the `aws-auth` ConfigMap and can't be undone), or API endpoint access (`endpointPublicAccess`, `endpointPrivateAccess`, `publicAccessCidrs`). Endpoint settings you omit keep their current values. Returns an update, with the cluster name and Region to poll it with. Execute API only.

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
:   Creates an access entry so an IAM user or role can authenticate to the cluster. Parameters: `clusterName`, `principalArn`, and optional `kubernetesGroups`, `username`, `type`, `tags`. Execute API only.

`updateAccessEntry`
:   Replaces the Kubernetes groups or username of an access entry. The one you omit keeps its current value. Parameters: `clusterName`, `principalArn`, and `kubernetesGroups` or `username`. Execute API only.

`deleteAccessEntry`
:   Deletes an access entry, revoking the principal's cluster access. Parameters: `clusterName`, `principalArn`. Execute API only.

`associateAccessPolicy`
:   Binds an access policy to an access entry, cluster-wide or scoped to namespaces. Parameters: `clusterName`, `principalArn`, `policyArn`, `accessScopeType`, `namespaces`. Execute API only.

`disassociateAccessPolicy`
:   Removes an access policy from an access entry. Parameters: `clusterName`, `principalArn`, `policyArn`. Execute API only.

## Usage notes [aws-eks-usage-notes]

* Node group sizes are totals across the group's subnets, not per zone. `desiredSize` must stay within `minSize` and `maxSize`, so widen `maxSize` in the same call when scaling past the current maximum. If the Cluster Autoscaler or Karpenter manages the group, change the bounds instead of `desiredSize`.
* Updates are slow. Node group scaling takes 1 to 5 minutes; control-plane changes such as logging or endpoint access take 5 to 25 minutes. Do not wait for an update in a single call: keep the update ID and poll `describeUpdate` later, with a wait between polls, so the calling agent turn does not time out. EKS runs one update per node group and one cluster-level update at a time.
* To let the connector's IAM identity (or any other principal) reach the Kubernetes API, create an access entry, then bind an access policy to it, with `createAccessEntry` and `associateAccessPolicy` through the execute API or in the EKS console. Access entries require the cluster authentication mode `API` or `API_AND_CONFIG_MAP`.
* To manage workloads from {{kib}}, create a Kubernetes connector with the **Amazon EKS** authentication type, the same access key, the Region and cluster name, and the `kubernetesConnector.apiUrl` and `caCertificatePem` returned by `getCluster`. That connector mints its own token on every call, so `getToken` is only needed when another system consumes the token.
* `updateAccessEntry` replaces the Kubernetes group list, and `updateClusterAccessConfig` replaces the public CIDR allowlist when you pass `publicAccessCidrs`. Read the current values first and include everything you want to keep.

## Connector networking configuration [aws-eks-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-eks-api-credentials]

1. Sign in to the [AWS IAM console](https://console.aws.amazon.com/iam/).
2. Create (or choose) an IAM user dedicated to this connector. The connector signs requests with a static access key, and only IAM users have access keys.
3. Attach a policy granting the actions below. EKS grants each action on a different resource, so scope every statement to the resource type the action requires. An action scoped to the wrong resource type is denied.
   - **All resources (`"Resource": "*"`)**: `eks:ListClusters` and `eks:ListAccessPolicies`. These actions don't support resource-level permissions. The connector test calls `ListClusters`, so a policy that scopes it to cluster ARNs fails the test.
   - **Clusters** (`arn:aws:eks:<region>:<account-id>:cluster/<cluster-name>`): `eks:DescribeCluster`, `eks:ListNodegroups`, `eks:ListUpdates`, `eks:DescribeUpdate`, `eks:ListTagsForResource`, `eks:ListAccessEntries`, `eks:UpdateClusterConfig` (used by both `updateClusterConfig` and `updateClusterAccessConfig`), `eks:CreateAccessEntry`.
   - **Node groups** (`arn:aws:eks:<region>:<account-id>:nodegroup/<cluster-name>/*`): `eks:DescribeNodegroup`, `eks:UpdateNodegroupConfig`, and `eks:ListTagsForResource`, `eks:ListUpdates`, `eks:DescribeUpdate` for node group tags and updates.
   - **Access entries** (`arn:aws:eks:<region>:<account-id>:access-entry/<cluster-name>/*`): `eks:DescribeAccessEntry`, `eks:ListAssociatedAccessPolicies`, `eks:UpdateAccessEntry`, `eks:DeleteAccessEntry`, `eks:AssociateAccessPolicy`, `eks:DisassociateAccessPolicy`.

   Leave out the write actions you don't want the connector to perform. `updateNodegroupConfig`, `updateClusterAccessConfig`, and `updateAccessEntry` also read the current node group, cluster, or access entry first, so they need `eks:DescribeNodegroup`, `eks:DescribeCluster`, or `eks:DescribeAccessEntry`. `getToken` needs no extra IAM permission (`sts:GetCallerIdentity` is always allowed), but the identity must have an access entry on the cluster for the token to be accepted.
4. Create an access key for that user (**Security credentials** → **Access keys** → **Create access key**).
5. Copy the **Access key ID** and **Secret access key**, and enter them along with the AWS Region when configuring the connector in {{kib}}.
