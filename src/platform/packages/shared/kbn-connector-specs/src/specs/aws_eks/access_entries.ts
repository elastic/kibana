/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import { accessEntryPath, eksBase, request, resolveCluster, resolveRegion } from './client';
import { trimAccessEntry, trimAssociatedPolicy } from './format';
import type {
  AssociateAccessPolicyInput,
  CreateAccessEntryInput,
  DeleteAccessEntryInput,
  DescribeAccessEntryInput,
  DisassociateAccessPolicyInput,
  EksAccessEntry,
  EksAssociatedAccessPolicy,
  ListAccessEntriesInput,
  ListAccessPoliciesInput,
  ListAssociatedAccessPoliciesInput,
  UpdateAccessEntryInput,
} from './types';
import {
  AssociateAccessPolicyInputSchema,
  CreateAccessEntryInputSchema,
  DeleteAccessEntryInputSchema,
  DescribeAccessEntryInputSchema,
  DisassociateAccessPolicyInputSchema,
  ListAccessEntriesInputSchema,
  ListAccessPoliciesInputSchema,
  ListAssociatedAccessPoliciesInputSchema,
  UpdateAccessEntryInputSchema,
} from './types';

/**
 * Cluster access entries and EKS access policies. The reads are agent tools; every write grants
 * or revokes cluster access, so it stays out of the agent tool set (`isTool: false`).
 */
export const accessEntryActions: ConnectorSpec['actions'] = {
  listAccessPolicies: {
    isTool: true,
    scope: 'read',
    description:
      'List the EKS-managed access policies that can be associated with an access entry (AmazonEKSClusterAdminPolicy, AmazonEKSAdminPolicy, AmazonEKSEditPolicy, AmazonEKSViewPolicy, and others) with their ARNs. Use it to interpret the policyArn values listAssociatedAccessPolicies returns.',
    input: ListAccessPoliciesInputSchema,
    handler: async (ctx, input: ListAccessPoliciesInput) => {
      const region = resolveRegion(ctx, input.region);
      const data = await request<{
        accessPolicies?: Array<{ name?: string; arn?: string }>;
        nextToken?: string;
      }>(() =>
        ctx.client.get(`${eksBase(region)}/access-policies`, {
          params: { maxResults: input.maxResults, nextToken: input.nextToken },
        })
      );
      return {
        accessPolicies: (data.accessPolicies ?? []).map(({ name, arn }) => ({ name, arn })),
        nextToken: data.nextToken,
      };
    },
  },

  listAccessEntries: {
    isTool: true,
    scope: 'read',
    description:
      'List the IAM principal ARNs that have an access entry on a cluster, optionally only those with a given access policy associated. Use it to audit who can reach the Kubernetes API.',
    input: ListAccessEntriesInputSchema,
    handler: async (ctx, input: ListAccessEntriesInput) => {
      const { url } = resolveCluster(ctx, input);
      const data = await request<{ accessEntries?: string[]; nextToken?: string }>(() =>
        ctx.client.get(`${url}/access-entries`, {
          params: {
            associatedPolicyArn: input.associatedPolicyArn,
            maxResults: input.maxResults,
            nextToken: input.nextToken,
          },
        })
      );
      return { principalArns: data.accessEntries ?? [], nextToken: data.nextToken };
    },
  },

  describeAccessEntry: {
    isTool: true,
    scope: 'read',
    description:
      "Describe one principal's access entry on a cluster: type, Kubernetes username and groups, tags, and timestamps. Pair with listAssociatedAccessPolicies to see the policies that actually grant permissions.",
    input: DescribeAccessEntryInputSchema,
    handler: async (ctx, input: DescribeAccessEntryInput) => {
      const region = resolveRegion(ctx, input.region);
      const data = await request<{ accessEntry?: EksAccessEntry }>(() =>
        ctx.client.get(accessEntryPath(region, input.clusterName, input.principalArn))
      );
      return trimAccessEntry(data.accessEntry ?? {});
    },
  },

  listAssociatedAccessPolicies: {
    isTool: true,
    scope: 'read',
    description:
      "List the access policies associated with a principal's access entry, each with its scope (cluster-wide or a namespace list). The read half of cluster RBAC: what the principal may do once it authenticates.",
    input: ListAssociatedAccessPoliciesInputSchema,
    handler: async (ctx, input: ListAssociatedAccessPoliciesInput) => {
      const region = resolveRegion(ctx, input.region);
      const data = await request<{
        associatedAccessPolicies?: EksAssociatedAccessPolicy[];
        nextToken?: string;
      }>(() =>
        ctx.client.get(
          `${accessEntryPath(region, input.clusterName, input.principalArn)}/access-policies`,
          { params: { maxResults: input.maxResults, nextToken: input.nextToken } }
        )
      );
      return {
        principalArn: input.principalArn,
        associatedAccessPolicies: (data.associatedAccessPolicies ?? []).map(trimAssociatedPolicy),
        nextToken: data.nextToken,
      };
    },
  },

  createAccessEntry: {
    isTool: false,
    scope: 'write',
    description:
      "Create an access entry so an IAM user or role can authenticate to the cluster's Kubernetes API. On its own it grants no permissions: follow with associateAccessPolicy (EKS-managed policy) or map kubernetesGroups to RBAC bindings. The onboarding step for the connector's own identity before getToken. Requires authenticationMode API or API_AND_CONFIG_MAP. Applies immediately; no Update to poll.",
    input: CreateAccessEntryInputSchema,
    handler: async (ctx, input: CreateAccessEntryInput) => {
      const { url } = resolveCluster(ctx, input);
      const { principalArn, kubernetesGroups, username, type, tags } = input;
      const data = await request<{ accessEntry?: EksAccessEntry }>(() =>
        ctx.client.post(`${url}/access-entries`, {
          principalArn,
          kubernetesGroups,
          username,
          type,
          tags,
        })
      );
      return trimAccessEntry(data.accessEntry ?? {});
    },
  },

  updateAccessEntry: {
    isTool: false,
    scope: 'destroy',
    description:
      "Change an access entry's Kubernetes groups or username; the one you omit is kept. kubernetesGroups REPLACES the current list (read it with describeAccessEntry first); pass [] to strip every group as a containment step. Applies immediately.",
    input: UpdateAccessEntryInputSchema,
    handler: async (ctx, input: UpdateAccessEntryInput) => {
      const region = resolveRegion(ctx, input.region);
      const path = accessEntryPath(region, input.clusterName, input.principalArn);
      // EKS resets whichever of the two fields the update body omits, so carry the current value.
      const current =
        input.kubernetesGroups === undefined || input.username === undefined
          ? (await request<{ accessEntry?: EksAccessEntry }>(() => ctx.client.get(path)))
              .accessEntry ?? {}
          : {};
      const data = await request<{ accessEntry?: EksAccessEntry }>(() =>
        ctx.client.post(path, {
          kubernetesGroups: input.kubernetesGroups ?? current.kubernetesGroups,
          username: input.username ?? current.username,
        })
      );
      return trimAccessEntry(data.accessEntry ?? {});
    },
  },

  deleteAccessEntry: {
    isTool: false,
    scope: 'destroy',
    description:
      "Delete a principal's access entry, revoking its ability to authenticate to the cluster (its policy associations go with it). The rollback for createAccessEntry and the containment move for a compromised IAM identity. Applies immediately.",
    input: DeleteAccessEntryInputSchema,
    handler: async (ctx, input: DeleteAccessEntryInput) => {
      const region = resolveRegion(ctx, input.region);
      await request<unknown>(() =>
        ctx.client.delete(accessEntryPath(region, input.clusterName, input.principalArn))
      );
      return { deleted: true, principalArn: input.principalArn, clusterName: input.clusterName };
    },
  },

  associateAccessPolicy: {
    isTool: false,
    scope: 'write',
    description:
      "Bind an EKS access policy to a principal's access entry, cluster-wide or scoped to namespaces: the RBAC half of cluster auth. For example AmazonEKSViewPolicy cluster-wide for read-only automation, or AmazonEKSEditPolicy on one namespace for a remediation job. Requires an existing access entry (createAccessEntry). Applies immediately.",
    input: AssociateAccessPolicyInputSchema,
    handler: async (ctx, input: AssociateAccessPolicyInput) => {
      const region = resolveRegion(ctx, input.region);
      const data = await request<{ associatedAccessPolicy?: EksAssociatedAccessPolicy }>(() =>
        ctx.client.post(
          `${accessEntryPath(region, input.clusterName, input.principalArn)}/access-policies`,
          {
            policyArn: input.policyArn,
            accessScope: {
              type: input.accessScopeType,
              ...(input.namespaces ? { namespaces: input.namespaces } : {}),
            },
          }
        )
      );
      return {
        principalArn: input.principalArn,
        clusterName: input.clusterName,
        associatedAccessPolicy: trimAssociatedPolicy(data.associatedAccessPolicy ?? {}),
      };
    },
  },

  disassociateAccessPolicy: {
    isTool: false,
    scope: 'destroy',
    description:
      "Remove an access policy from a principal's access entry, revoking the permissions it granted while keeping the entry itself. The rollback for associateAccessPolicy. Applies immediately.",
    input: DisassociateAccessPolicyInputSchema,
    handler: async (ctx, input: DisassociateAccessPolicyInput) => {
      const region = resolveRegion(ctx, input.region);
      const { clusterName, principalArn, policyArn } = input;
      await request<unknown>(() =>
        ctx.client.delete(
          `${accessEntryPath(
            region,
            clusterName,
            principalArn
          )}/access-policies/${encodeURIComponent(policyArn)}`
        )
      );
      return { disassociated: true, principalArn, policyArn, clusterName };
    },
  },
};
