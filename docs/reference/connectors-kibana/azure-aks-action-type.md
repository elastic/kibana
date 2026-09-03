---
navigation_title: "Azure Kubernetes Service (AKS)"
type: reference
description: "Use the Azure Kubernetes Service connector to list, inspect, and manage AKS clusters and node pools."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Azure Kubernetes Service (AKS) connector [azure-aks-action-type]

The Azure Kubernetes Service (AKS) connector connects directly to the Azure Resource Manager (ARM) REST API. It lets a workflow or agent inspect and control AKS clusters without leaving Elastic: list subscriptions and resource groups, discover clusters and node pools, scale node counts, stop or start clusters to manage costs, retrieve kubeconfig credentials, and run ad-hoc `kubectl` or `helm` commands inside a cluster.

## Overview

This is a **custom connector** that authenticates as an Azure AD app registration (service principal) using the OAuth 2.0 Client Credentials grant. The token is scoped to `https://management.azure.com/.default` (the Azure Resource Manager audience).

## Create connectors in {{kib}} [define-azure-aks-ui]

You can create an Azure Kubernetes Service connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [azure-aks-connector-configuration]

Subscription ID (optional)
:   The Azure subscription ID (a GUID) that contains your AKS clusters. This field is optional — you can omit it and use `listSubscriptions` to discover available subscriptions at runtime. Most other actions require a subscription ID to be configured here.

Token URL
:   The Azure AD v2.0 token endpoint for your tenant: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`, with `{tenant-id}` replaced by your Azure AD tenant ID.

Client ID
:   The Application (client) ID of the Azure AD app registration.

Client Secret
:   A client secret created for the Azure AD app registration.

The app registration must have at least the **Azure Kubernetes Service Cluster User Role** on the target clusters for read-only actions. For control-plane actions (scale, stop, start, run-command), the **Azure Kubernetes Service Contributor Role** is required.

## Available actions [azure-aks-available-actions]

| Action | Description |
|--------|-------------|
| `listSubscriptions` | List all Azure subscriptions accessible to the service principal. No parameters. |
| `listResourceGroups` | List all resource groups in the configured subscription. No parameters. |
| `listClusters` | List AKS clusters in the subscription, optionally scoped to a resource group. Parameters: `resourceGroupName` (optional). |
| `getCluster` | Get full details for a single AKS cluster. Parameters: `resourceGroupName`, `clusterName` (both required). |
| `listNodePools` | List all node pools in an AKS cluster. Parameters: `resourceGroupName`, `clusterName` (both required). |
| `getNodePool` | Get full details for a single node pool. Parameters: `resourceGroupName`, `clusterName`, `nodePoolName` (all required). |
| `scaleNodePool` | Set the node count of a node pool. Parameters: `resourceGroupName`, `clusterName`, `nodePoolName`, `count` (all required). |
| `stopCluster` | Deallocate all node VMs in a cluster. Parameters: `resourceGroupName`, `clusterName` (both required). |
| `startCluster` | Start a previously stopped cluster. Parameters: `resourceGroupName`, `clusterName` (both required). |
| `getClusterCredentials` | Retrieve a base64-encoded kubeconfig for a cluster. Parameters: `resourceGroupName`, `clusterName` (both required), `format` (`azure` or `exec`, default `azure`). |
| `runCommand` | Run a shell command inside the cluster (e.g. `kubectl get pods -A`). Parameters: `resourceGroupName`, `clusterName`, `command` (all required). Waits up to 60 seconds and returns the exit code and output. |

## Connector networking configuration [action-settings]

Use the [Action configuration settings](((kibana-ref))/alert-action-settings-kb.html#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Prerequisites [azure-aks-prerequisites]

1. **Azure AD app registration** — Create an app registration in Azure Active Directory and generate a client secret.
2. **Role assignments** — Assign the appropriate role to the service principal on each AKS cluster or resource group:
   - **Azure Kubernetes Service Cluster User Role** — minimum for read-only actions
   - **Azure Kubernetes Service Contributor Role** — required for scale, stop, start, and run-command
3. **Token URL** — Construct the token URL using your tenant ID: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
