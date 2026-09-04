/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { buildEksBearerToken } from '../../auth_types/eks_token_helpers';
import { AwsEks } from './aws_eks';

jest.mock('../../auth_types/eks_token_helpers', () => ({
  buildEksBearerToken: jest.fn(),
}));

const buildEksBearerTokenMock = jest.mocked(buildEksBearerToken);

const REGION = 'eu-north-1';
const API = `https://eks.${REGION}.amazonaws.com`;
const CLUSTER = `${API}/clusters/prod-eu`;
const NODEGROUP = `${CLUSTER}/node-groups/workers-general`;
const PRINCIPAL = 'arn:aws:iam::123456789012:role/kibana-workflows';
const ACCESS_ENTRY = `${CLUSTER}/access-entries/${encodeURIComponent(PRINCIPAL)}`;
const VIEW_POLICY = 'arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy';
const UPDATE_ID = '3f2a1b4c-9d8e-4f7a-b6c5-1a2b3c4d5e6f';
const CA_PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';

const sampleCluster = {
  name: 'prod-eu',
  arn: `arn:aws:eks:${REGION}:123456789012:cluster/prod-eu`,
  createdAt: '2026-01-01T00:00:00Z',
  version: '1.33',
  platformVersion: 'eks.5',
  endpoint: 'https://ABC123.gr7.eu-north-1.eks.amazonaws.com',
  roleArn: 'arn:aws:iam::123456789012:role/eks-cluster',
  status: 'ACTIVE',
  certificateAuthority: { data: btoa(CA_PEM) },
  resourcesVpcConfig: {
    vpcId: 'vpc-1',
    subnetIds: ['subnet-a', 'subnet-b'],
    securityGroupIds: ['sg-1'],
    clusterSecurityGroupId: 'sg-cluster',
    endpointPublicAccess: true,
    endpointPrivateAccess: false,
    publicAccessCidrs: ['0.0.0.0/0'],
  },
  kubernetesNetworkConfig: { serviceIpv4Cidr: '10.100.0.0/16', ipFamily: 'ipv4' },
  logging: {
    clusterLogging: [
      { types: ['api', 'audit'], enabled: true },
      { types: ['authenticator', 'controllerManager', 'scheduler'], enabled: false },
    ],
  },
  accessConfig: {
    authenticationMode: 'API_AND_CONFIG_MAP',
    bootstrapClusterCreatorAdminPermissions: true,
  },
  upgradePolicy: { supportType: 'EXTENDED' },
  health: { issues: [] },
  tags: { env: 'prod' },
};

const sampleNodegroup = {
  nodegroupName: 'workers-general',
  nodegroupArn: `arn:aws:eks:${REGION}:123456789012:nodegroup/prod-eu/workers-general/1`,
  clusterName: 'prod-eu',
  version: '1.33',
  releaseVersion: '1.33.0-20260101',
  status: 'ACTIVE',
  capacityType: 'ON_DEMAND',
  scalingConfig: { minSize: 1, maxSize: 5, desiredSize: 2 },
  instanceTypes: ['m6i.large'],
  subnets: ['subnet-a'],
  amiType: 'AL2023_x86_64_STANDARD',
  nodeRole: 'arn:aws:iam::123456789012:role/eks-nodes',
  labels: { workload: 'web' },
  taints: [{ key: 'dedicated', value: 'web', effect: 'NO_SCHEDULE' }],
  resources: { autoScalingGroups: [{ name: 'eks-workers-general-abc' }] },
  diskSize: 20,
  health: { issues: [] },
  updateConfig: { maxUnavailable: 1, updateStrategy: 'DEFAULT' },
  nodeRepairConfig: { enabled: false },
  tags: {},
};

const sampleUpdate = {
  id: UPDATE_ID,
  status: 'InProgress',
  type: 'ConfigUpdate',
  params: [{ type: 'DesiredSize', value: '3' }],
  createdAt: '2026-09-03T08:00:00Z',
  errors: [],
};

const sampleAccessEntry = {
  clusterName: 'prod-eu',
  principalArn: PRINCIPAL,
  kubernetesGroups: ['viewers'],
  accessEntryArn: `arn:aws:eks:${REGION}:123456789012:access-entry/prod-eu/role/123456789012/kibana-workflows/abc`,
  createdAt: '2026-09-03T08:00:00Z',
  modifiedAt: '2026-09-03T08:00:00Z',
  tags: {},
  username: `arn:aws:sts::123456789012:assumed-role/kibana-workflows/{{SessionName}}`,
  type: 'STANDARD',
};

type ActionName = keyof typeof AwsEks.actions;

const parse = (action: ActionName, raw: Record<string, unknown>) =>
  AwsEks.actions[action].input.parse(raw);

describe('AwsEks', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { region: REGION },
    secrets: { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const run = (action: ActionName, raw: Record<string, unknown>, ctx = mockContext) =>
    AwsEks.actions[action].handler(ctx, parse(action, raw));

  beforeEach(() => {
    jest.clearAllMocks();
    buildEksBearerTokenMock.mockResolvedValue('k8s-aws-v1.dGVzdA');
  });

  describe('spec', () => {
    it('is wired into all_specs', () => {
      expect(getConnectorSpec('.aws_eks')).toBe(AwsEks);
    });

    it('has the expected metadata and reuses the shared AWS credentials auth type', () => {
      expect(AwsEks.metadata.id).toBe('.aws_eks');
      expect(AwsEks.metadata.displayName).toBe('Amazon EKS');
      expect(AwsEks.metadata.minimumLicense).toBe('enterprise');
      expect(AwsEks.metadata.isTechnicalPreview).toBe(true);
      expect(AwsEks.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(AwsEks.auth?.types).toEqual(['aws_credentials']);
      expect(AwsEks.test?.enabled).toBe(true);
    });

    it('gives every action a description and an explicit scope', () => {
      for (const action of Object.values(AwsEks.actions)) {
        expect(['read', 'write', 'destroy']).toContain(action.scope);
        expect(typeof action.description).toBe('string');
        expect(action.description?.length).toBeGreaterThan(40);
      }
    });

    it('keeps access grants and the token mint out of the agent tool set', () => {
      const workflowOnly = Object.entries(AwsEks.actions)
        .filter(([, action]) => action.isTool === false)
        .map(([name]) => name)
        .sort();
      expect(workflowOnly).toEqual([
        'associateAccessPolicy',
        'createAccessEntry',
        'deleteAccessEntry',
        'disassociateAccessPolicy',
        'getToken',
        'updateAccessEntry',
      ]);
    });

    it('documents the async update model and the hand-off to the Kubernetes connector', () => {
      expect(AwsEks.skill).toContain('describeUpdate');
      expect(AwsEks.skill).toContain('getToken');
      expect(AwsEks.skill).toContain('createAccessEntry');
    });
  });

  describe('region resolution', () => {
    it('uses the connector region by default and an explicit region when given', async () => {
      mockClient.get.mockResolvedValue({ data: { clusters: ['a'] } });
      await run('listClusters', {});
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/clusters`, {
        params: { maxResults: undefined, nextToken: undefined, include: undefined },
      });
      await run('listClusters', {
        region: 'us-east-1',
        includeConnectedClusters: true,
        maxResults: 10,
      });
      expect(mockClient.get).toHaveBeenLastCalledWith(
        'https://eks.us-east-1.amazonaws.com/clusters',
        {
          params: { maxResults: 10, nextToken: undefined, include: 'all' },
        }
      );
    });

    it('fails clearly when no region is available', async () => {
      const ctx = { ...mockContext, config: {} } as unknown as ActionContext;
      await expect(run('listClusters', {}, ctx)).rejects.toThrow('No AWS Region available');
    });

    it('rejects malformed identifiers before any request is made', () => {
      expect(() => parse('getCluster', { clusterName: 'has space' })).toThrow();
      expect(() => parse('getCluster', { clusterName: 'ok', region: 'US_EAST' })).toThrow();
      expect(() =>
        parse('describeAccessEntry', { clusterName: 'ok', principalArn: 'not-an-arn' })
      ).toThrow();
      expect(() =>
        parse('describeUpdate', { clusterName: 'ok', updateId: 'not-a-uuid' })
      ).toThrow();
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('discovery and auth bridge', () => {
    it('listClusters returns names and the pagination token', async () => {
      mockClient.get.mockResolvedValue({
        data: { clusters: ['prod-eu', 'staging'], nextToken: 't' },
      });
      expect(await run('listClusters', {})).toEqual({
        region: REGION,
        clusters: ['prod-eu', 'staging'],
        nextToken: 't',
      });
    });

    it('getCluster trims the cluster and decodes the CA for the Kubernetes connector', async () => {
      mockClient.get.mockResolvedValue({ data: { cluster: sampleCluster } });
      const result = await run('getCluster', { clusterName: 'prod-eu' });
      expect(mockClient.get).toHaveBeenCalledWith(CLUSTER);
      expect(result).toMatchObject({
        name: 'prod-eu',
        region: REGION,
        status: 'ACTIVE',
        version: '1.33',
        endpoint: sampleCluster.endpoint,
        authenticationMode: 'API_AND_CONFIG_MAP',
        enabledLogTypes: ['api', 'audit'],
        vpc: {
          endpointPublicAccess: true,
          endpointPrivateAccess: false,
          publicAccessCidrs: ['0.0.0.0/0'],
        },
        supportType: 'EXTENDED',
        autoMode: false,
        kubernetesConnector: {
          apiUrl: sampleCluster.endpoint,
          caCertificatePem: CA_PEM,
          authType: 'kubernetes_eks',
          region: REGION,
          clusterName: 'prod-eu',
        },
      });
    });

    it('getToken mints a token with the connector credentials and returns the cluster target', async () => {
      mockClient.get.mockResolvedValue({ data: { cluster: sampleCluster } });
      const result = (await run('getToken', { clusterName: 'prod-eu' })) as Record<string, unknown>;
      expect(buildEksBearerTokenMock).toHaveBeenCalledWith({
        accessKeyId: 'AKIAEXAMPLE',
        secretAccessKey: 'secret',
        region: REGION,
        clusterName: 'prod-eu',
      });
      expect(result).toMatchObject({
        clusterName: 'prod-eu',
        region: REGION,
        tokenType: 'Bearer',
        token: 'k8s-aws-v1.dGVzdA',
        tokenLifetimeSeconds: 900,
        endpoint: sampleCluster.endpoint,
        caCertificatePem: CA_PEM,
        clusterStatus: 'ACTIVE',
      });
      expect(new Date(result.expiresAt as string).getTime()).toBeGreaterThan(Date.now());
    });

    it('getToken skips the describe call when cluster details are not wanted', async () => {
      const result = await run('getToken', {
        clusterName: 'prod-eu',
        includeClusterDetails: false,
      });
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('endpoint');
    });

    it('getToken fails clearly without an access key', async () => {
      const ctx = { ...mockContext, secrets: {} } as unknown as ActionContext;
      await expect(run('getToken', { clusterName: 'prod-eu' }, ctx)).rejects.toThrow(
        'no AWS access key configured'
      );
    });
  });

  describe('node groups', () => {
    const ref = { clusterName: 'prod-eu', nodegroupName: 'workers-general' };

    it('listNodegroups and describeNodegroup hit the node-groups paths and trim the result', async () => {
      mockClient.get.mockResolvedValue({ data: { nodegroups: ['workers-general'] } });
      expect(await run('listNodegroups', { clusterName: 'prod-eu', maxResults: 5 })).toEqual({
        nodegroups: ['workers-general'],
        nextToken: undefined,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${CLUSTER}/node-groups`, {
        params: { maxResults: 5, nextToken: undefined },
      });

      mockClient.get.mockResolvedValue({ data: { nodegroup: sampleNodegroup } });
      const result = await run('describeNodegroup', ref);
      expect(mockClient.get).toHaveBeenLastCalledWith(NODEGROUP);
      expect(result).toMatchObject({
        nodegroupName: 'workers-general',
        status: 'ACTIVE',
        capacityType: 'ON_DEMAND',
        scalingConfig: { minSize: 1, maxSize: 5, desiredSize: 2 },
        instanceTypes: ['m6i.large'],
        labels: { workload: 'web' },
        nodeRepairEnabled: false,
        autoScalingGroups: ['eks-workers-general-abc'],
        healthIssues: [],
      });
    });

    it('updateNodegroupConfig sends only the requested sections and returns the update', async () => {
      mockClient.post.mockResolvedValue({ data: { update: sampleUpdate } });
      const result = await run('updateNodegroupConfig', { ...ref, desiredSize: 3, maxSize: 6 });
      expect(mockClient.post).toHaveBeenCalledWith(`${NODEGROUP}/update-config`, {
        scalingConfig: { minSize: undefined, maxSize: 6, desiredSize: 3 },
        labels: undefined,
        taints: undefined,
        updateConfig: undefined,
        nodeRepairConfig: undefined,
      });
      expect(result).toMatchObject({
        nodegroupName: 'workers-general',
        id: UPDATE_ID,
        status: 'InProgress',
        done: false,
        succeeded: false,
        params: [{ type: 'DesiredSize', value: '3' }],
      });
    });

    it('updateNodegroupConfig maps labels, taints, update settings and node repair', async () => {
      mockClient.post.mockResolvedValue({ data: { update: sampleUpdate } });
      await run('updateNodegroupConfig', {
        ...ref,
        labelsToAdd: { workload: 'batch' },
        labelsToRemove: ['old'],
        taintsToAdd: [{ key: 'dedicated', value: 'batch', effect: 'NO_SCHEDULE' }],
        maxUnavailablePercentage: 25,
        updateStrategy: 'MINIMAL',
        nodeRepairEnabled: true,
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${NODEGROUP}/update-config`, {
        scalingConfig: undefined,
        labels: { addOrUpdateLabels: { workload: 'batch' }, removeLabels: ['old'] },
        taints: {
          addOrUpdateTaints: [{ key: 'dedicated', value: 'batch', effect: 'NO_SCHEDULE' }],
          removeTaints: undefined,
        },
        updateConfig: {
          maxUnavailable: undefined,
          maxUnavailablePercentage: 25,
          updateStrategy: 'MINIMAL',
        },
        nodeRepairConfig: { enabled: true },
      });
    });

    it('updateNodegroupConfig validates the scaling bounds', () => {
      expect(() => parse('updateNodegroupConfig', ref)).toThrow('at least one field');
      expect(() => parse('updateNodegroupConfig', { ...ref, minSize: 5, maxSize: 2 })).toThrow(
        'minSize must not exceed maxSize'
      );
      expect(() => parse('updateNodegroupConfig', { ...ref, desiredSize: 7, maxSize: 5 })).toThrow(
        'desiredSize must lie within'
      );
      expect(() =>
        parse('updateNodegroupConfig', { ...ref, maxUnavailable: 1, maxUnavailablePercentage: 10 })
      ).toThrow('not both');
      expect(() => parse('updateNodegroupConfig', { ...ref, desiredSize: 0 })).not.toThrow();
    });
  });

  describe('updates', () => {
    it('describeUpdate passes the node group as a query parameter and derives done/succeeded', async () => {
      mockClient.get.mockResolvedValue({
        data: { update: { ...sampleUpdate, status: 'Successful' } },
      });
      const result = await run('describeUpdate', {
        clusterName: 'prod-eu',
        updateId: UPDATE_ID,
        nodegroupName: 'workers-general',
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${CLUSTER}/updates/${UPDATE_ID}`, {
        params: { nodegroupName: 'workers-general' },
      });
      expect(result).toMatchObject({
        id: UPDATE_ID,
        status: 'Successful',
        done: true,
        succeeded: true,
      });
    });

    it('describeUpdate surfaces failures', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          update: {
            ...sampleUpdate,
            status: 'Failed',
            errors: [
              {
                errorCode: 'InsufficientFreeAddresses',
                errorMessage: 'No IPs',
                resourceIds: ['subnet-a'],
              },
            ],
          },
        },
      });
      const result = await run('describeUpdate', { clusterName: 'prod-eu', updateId: UPDATE_ID });
      expect(result).toMatchObject({
        done: true,
        succeeded: false,
        errors: [
          {
            errorCode: 'InsufficientFreeAddresses',
            errorMessage: 'No IPs',
            resourceIds: ['subnet-a'],
          },
        ],
      });
    });

    it('listUpdates lists cluster or node group updates', async () => {
      mockClient.get.mockResolvedValue({ data: { updateIds: [UPDATE_ID] } });
      expect(
        await run('listUpdates', { clusterName: 'prod-eu', nodegroupName: 'workers-general' })
      ).toEqual({ updateIds: [UPDATE_ID], nextToken: undefined });
      expect(mockClient.get).toHaveBeenCalledWith(`${CLUSTER}/updates`, {
        params: { nodegroupName: 'workers-general', maxResults: undefined, nextToken: undefined },
      });
    });
  });

  describe('cluster configuration and tags', () => {
    it('updateClusterConfig builds logging and access config payloads', async () => {
      mockClient.post.mockResolvedValue({
        data: { update: { ...sampleUpdate, type: 'LoggingUpdate' } },
      });
      await run('updateClusterConfig', {
        clusterName: 'prod-eu',
        enableLogTypes: ['audit'],
        disableLogTypes: ['scheduler'],
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${CLUSTER}/update-config`, {
        logging: {
          clusterLogging: [
            { types: ['audit'], enabled: true },
            { types: ['scheduler'], enabled: false },
          ],
        },
        accessConfig: undefined,
        resourcesVpcConfig: undefined,
        upgradePolicy: undefined,
        deletionProtection: undefined,
      });

      await run('updateClusterConfig', {
        clusterName: 'prod-eu',
        authenticationMode: 'API',
        endpointPublicAccess: true,
        publicAccessCidrs: ['203.0.113.0/24'],
      });
      expect(mockClient.post).toHaveBeenLastCalledWith(`${CLUSTER}/update-config`, {
        logging: undefined,
        accessConfig: { authenticationMode: 'API' },
        resourcesVpcConfig: {
          endpointPublicAccess: true,
          endpointPrivateAccess: undefined,
          publicAccessCidrs: ['203.0.113.0/24'],
        },
        upgradePolicy: undefined,
        deletionProtection: undefined,
      });
    });

    it('updateClusterConfig requires a change and rejects contradictory log types', () => {
      expect(() => parse('updateClusterConfig', { clusterName: 'prod-eu' })).toThrow(
        'at least one field'
      );
      expect(() =>
        parse('updateClusterConfig', {
          clusterName: 'prod-eu',
          enableLogTypes: ['api'],
          disableLogTypes: ['api'],
        })
      ).toThrow('both enabled and disabled');
    });

    it('listTagsForResource encodes the ARN into the path', async () => {
      mockClient.get.mockResolvedValue({ data: { tags: { env: 'prod' } } });
      const arn = `arn:aws:eks:${REGION}:123456789012:cluster/prod-eu`;
      expect(await run('listTagsForResource', { resourceArn: arn })).toEqual({
        resourceArn: arn,
        tags: { env: 'prod' },
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/tags/${encodeURIComponent(arn)}`);
    });
  });

  describe('access entries and policies', () => {
    const ref = { clusterName: 'prod-eu', principalArn: PRINCIPAL };

    it('lists and describes access entries and policies', async () => {
      mockClient.get.mockResolvedValue({
        data: { accessPolicies: [{ name: 'AmazonEKSViewPolicy', arn: VIEW_POLICY }] },
      });
      expect(await run('listAccessPolicies', {})).toEqual({
        accessPolicies: [{ name: 'AmazonEKSViewPolicy', arn: VIEW_POLICY }],
        nextToken: undefined,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/access-policies`, {
        params: { maxResults: undefined, nextToken: undefined },
      });

      mockClient.get.mockResolvedValue({ data: { accessEntries: [PRINCIPAL] } });
      expect(
        await run('listAccessEntries', { clusterName: 'prod-eu', associatedPolicyArn: VIEW_POLICY })
      ).toEqual({ principalArns: [PRINCIPAL], nextToken: undefined });
      expect(mockClient.get).toHaveBeenLastCalledWith(`${CLUSTER}/access-entries`, {
        params: { associatedPolicyArn: VIEW_POLICY, maxResults: undefined, nextToken: undefined },
      });

      mockClient.get.mockResolvedValue({ data: { accessEntry: sampleAccessEntry } });
      expect(await run('describeAccessEntry', ref)).toMatchObject({
        principalArn: PRINCIPAL,
        type: 'STANDARD',
        kubernetesGroups: ['viewers'],
      });
      expect(mockClient.get).toHaveBeenLastCalledWith(ACCESS_ENTRY);

      mockClient.get.mockResolvedValue({
        data: {
          associatedAccessPolicies: [
            { policyArn: VIEW_POLICY, accessScope: { type: 'namespace', namespaces: ['web'] } },
          ],
        },
      });
      expect(await run('listAssociatedAccessPolicies', ref)).toMatchObject({
        principalArn: PRINCIPAL,
        associatedAccessPolicies: [
          {
            policyArn: VIEW_POLICY,
            policyName: 'AmazonEKSViewPolicy',
            accessScope: { type: 'namespace', namespaces: ['web'] },
          },
        ],
      });
      expect(mockClient.get).toHaveBeenLastCalledWith(`${ACCESS_ENTRY}/access-policies`, {
        params: { maxResults: undefined, nextToken: undefined },
      });
    });

    it('createAccessEntry posts the principal and returns the trimmed entry', async () => {
      mockClient.post.mockResolvedValue({ data: { accessEntry: sampleAccessEntry } });
      const result = await run('createAccessEntry', {
        ...ref,
        kubernetesGroups: ['viewers'],
        tags: { 'managed-by': 'kibana' },
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${CLUSTER}/access-entries`, {
        principalArn: PRINCIPAL,
        kubernetesGroups: ['viewers'],
        username: undefined,
        type: undefined,
        tags: { 'managed-by': 'kibana' },
      });
      expect(result).toMatchObject({ principalArn: PRINCIPAL, kubernetesGroups: ['viewers'] });
    });

    it('updateAccessEntry requires a change and posts to the entry path', async () => {
      expect(() => parse('updateAccessEntry', ref)).toThrow('Provide kubernetesGroups');
      mockClient.post.mockResolvedValue({
        data: { accessEntry: { ...sampleAccessEntry, kubernetesGroups: [] } },
      });
      const result = await run('updateAccessEntry', { ...ref, kubernetesGroups: [] });
      expect(mockClient.post).toHaveBeenCalledWith(ACCESS_ENTRY, {
        kubernetesGroups: [],
        username: undefined,
      });
      expect(result).toMatchObject({ kubernetesGroups: [] });
    });

    it('deleteAccessEntry issues a DELETE on the entry', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      expect(await run('deleteAccessEntry', ref)).toEqual({
        deleted: true,
        principalArn: PRINCIPAL,
        clusterName: 'prod-eu',
      });
      expect(mockClient.delete).toHaveBeenCalledWith(ACCESS_ENTRY);
    });

    it('associateAccessPolicy sends the scope and validates namespaces', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          associatedAccessPolicy: {
            policyArn: VIEW_POLICY,
            accessScope: { type: 'namespace', namespaces: ['web'] },
            associatedAt: '2026-09-03T08:00:00Z',
          },
        },
      });
      const result = await run('associateAccessPolicy', {
        ...ref,
        policyArn: VIEW_POLICY,
        accessScopeType: 'namespace',
        namespaces: ['web'],
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${ACCESS_ENTRY}/access-policies`, {
        policyArn: VIEW_POLICY,
        accessScope: { type: 'namespace', namespaces: ['web'] },
      });
      expect(result).toMatchObject({
        associatedAccessPolicy: {
          policyName: 'AmazonEKSViewPolicy',
          accessScope: { namespaces: ['web'] },
        },
      });

      await run('associateAccessPolicy', {
        ...ref,
        policyArn: VIEW_POLICY,
        accessScopeType: 'cluster',
      });
      expect(mockClient.post).toHaveBeenLastCalledWith(`${ACCESS_ENTRY}/access-policies`, {
        policyArn: VIEW_POLICY,
        accessScope: { type: 'cluster' },
      });

      expect(() =>
        parse('associateAccessPolicy', {
          ...ref,
          policyArn: VIEW_POLICY,
          accessScopeType: 'namespace',
        })
      ).toThrow('at least one namespace');
      expect(() =>
        parse('associateAccessPolicy', {
          ...ref,
          policyArn: VIEW_POLICY,
          accessScopeType: 'cluster',
          namespaces: ['web'],
        })
      ).toThrow('only apply to a namespace-scoped');
      expect(() =>
        parse('associateAccessPolicy', {
          ...ref,
          policyArn: 'arn:aws:iam::aws:policy/Foo',
          accessScopeType: 'cluster',
        })
      ).toThrow();
    });

    it('disassociateAccessPolicy deletes the association', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });
      expect(await run('disassociateAccessPolicy', { ...ref, policyArn: VIEW_POLICY })).toEqual({
        disassociated: true,
        principalArn: PRINCIPAL,
        policyArn: VIEW_POLICY,
        clusterName: 'prod-eu',
      });
      expect(mockClient.delete).toHaveBeenCalledWith(
        `${ACCESS_ENTRY}/access-policies/${encodeURIComponent(VIEW_POLICY)}`
      );
    });
  });

  describe('errors', () => {
    it('surfaces the EKS error type from the header and the message from the body', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          headers: {
            'x-amzn-errortype':
              'ResourceNotFoundException:http://internal.amazon.com/coral/com.amazon.eks/',
          },
          data: { message: 'No cluster found for name: nope.' },
        },
      });
      await expect(run('getCluster', { clusterName: 'nope' })).rejects.toThrow(
        'Amazon EKS API error (404) [ResourceNotFoundException]: No cluster found for name: nope.'
      );
    });

    it('falls back to the body __type and rethrows network errors', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 409,
          data: {
            __type: 'com.amazon.eks#ResourceInUseException',
            message: 'Nodegroup already has an update in progress',
          },
        },
      });
      await expect(
        run('updateNodegroupConfig', {
          clusterName: 'prod-eu',
          nodegroupName: 'workers-general',
          desiredSize: 3,
        })
      ).rejects.toThrow(
        'Amazon EKS API error (409) [ResourceInUseException]: Nodegroup already has an update in progress'
      );
      const networkError = new Error('socket hang up');
      mockClient.get.mockRejectedValue(networkError);
      await expect(run('listClusters', {})).rejects.toBe(networkError);
    });
  });

  describe('test handler', () => {
    const runTest = () => {
      const handler = AwsEks.test?.handler;
      if (!handler) {
        throw new Error('test handler is not defined');
      }
      return handler(mockContext);
    };

    it('lists clusters in the configured region and reports the count', async () => {
      mockClient.get.mockResolvedValue({ data: { clusters: ['prod-eu'] } });
      expect(await runTest()).toEqual({
        message: `Connected to Amazon EKS: 1 cluster(s) visible in ${REGION}.`,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${API}/clusters`, {
        params: { maxResults: 100 },
      });
    });

    it('throws on an authorization failure', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          headers: { 'x-amzn-errortype': 'AccessDeniedException' },
          data: { message: 'User is not authorized to perform: eks:ListClusters' },
        },
      });
      await expect(runTest()).rejects.toThrow('Amazon EKS API error (403) [AccessDeniedException]');
    });
  });
});
