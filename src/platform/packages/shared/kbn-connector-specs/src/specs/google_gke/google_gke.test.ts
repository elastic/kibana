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
import { GoogleGke } from './google_gke';

const API = 'https://container.googleapis.com/v1';
const PROJECT = 'my-project-123';
const SA_PROJECT = 'sa-project-456';
const ZONE = 'us-central1-a';
const CLUSTER = `${API}/projects/${PROJECT}/locations/${ZONE}/clusters/prod-web`;
const POOL = `${CLUSTER}/nodePools/default-pool`;
const OPERATION_ID = 'operation-1756880000000-3f2a1b4c-9d8e-4f7a-b6c5-1a2b3c4d5e6f';

const serviceAccountJson = JSON.stringify({
  type: 'service_account',
  project_id: SA_PROJECT,
  client_email: 'kibana@sa-project-456.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
});

const CA_PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';

const sampleOperation = {
  name: OPERATION_ID,
  operationType: 'SET_NODE_POOL_SIZE',
  status: 'RUNNING',
  zone: ZONE,
  selfLink: `${API}/projects/1234/locations/${ZONE}/operations/${OPERATION_ID}`,
  targetLink: `${API}/projects/1234/locations/${ZONE}/clusters/prod-web/nodePools/default-pool`,
  startTime: '2026-09-03T08:00:00Z',
  progress: { status: 'RUNNING', metrics: [{ name: 'NODES_DONE', intValue: '1' }] },
};

const samplePool = {
  name: 'default-pool',
  status: 'RUNNING',
  version: '1.35.7-gke.1027000',
  initialNodeCount: 2,
  locations: ['us-central1-a', 'us-central1-b', 'us-central1-c'],
  config: {
    machineType: 'e2-standard-4',
    diskSizeGb: 100,
    diskType: 'pd-balanced',
    imageType: 'COS_CONTAINERD',
    serviceAccount: 'default',
    labels: { workload: 'web' },
    taints: [{ key: 'dedicated', value: 'web', effect: 'NO_SCHEDULE' }],
  },
  autoscaling: { enabled: true, minNodeCount: 1, maxNodeCount: 5 },
  management: { autoRepair: true, autoUpgrade: true },
  upgradeSettings: { maxSurge: 1, maxUnavailable: 0, strategy: 'SURGE' },
  maxPodsConstraint: { maxPodsPerNode: '110' },
  instanceGroupUrls: [
    'https://www.googleapis.com/compute/v1/projects/p/zones/z/instanceGroupManagers/gke-a',
  ],
  etag: 'pool-etag',
  selfLink: POOL,
};

const sampleCluster = {
  name: 'prod-web',
  description: 'Production web tier',
  location: ZONE,
  zone: ZONE,
  locations: [ZONE],
  status: 'RUNNING',
  currentMasterVersion: '1.35.7-gke.1027000',
  currentNodeVersion: '1.35.7-gke.1027000',
  initialClusterVersion: '1.35.7-gke.1027000',
  currentNodeCount: 2,
  endpoint: '203.0.113.10',
  masterAuth: { clusterCaCertificate: btoa(CA_PEM) },
  controlPlaneEndpointsConfig: {
    dnsEndpointConfig: { endpoint: 'gke-abc.us-central1-a.gke.goog' },
    ipEndpointsConfig: { publicEndpoint: '203.0.113.10', privateEndpoint: '10.0.0.2' },
  },
  network: 'default',
  subnetwork: 'default',
  clusterIpv4Cidr: '10.4.0.0/14',
  releaseChannel: { channel: 'REGULAR' },
  nodePools: [samplePool],
  networkPolicy: { provider: 'CALICO', enabled: true },
  masterAuthorizedNetworksConfig: {
    enabled: true,
    cidrBlocks: [{ cidrBlock: '198.51.100.0/24', displayName: 'office' }],
    gcpPublicCidrsAccessEnabled: true,
  },
  binaryAuthorization: { evaluationMode: 'DISABLED' },
  workloadIdentityConfig: { workloadPool: 'my-project-123.svc.id.goog' },
  autoscaling: { enableNodeAutoprovisioning: false },
  resourceLabels: { env: 'prod' },
  createTime: '2026-01-01T00:00:00Z',
  etag: 'cluster-etag',
  selfLink: CLUSTER,
};

type ActionName = keyof typeof GoogleGke.actions;

const parse = (action: ActionName, raw: Record<string, unknown>) =>
  GoogleGke.actions[action].input.parse(raw);

describe('GoogleGke', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {},
    secrets: { serviceAccountJson },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const withConfig = (config: Record<string, unknown>) =>
    ({ ...mockContext, config } as unknown as ActionContext);

  const run = (action: ActionName, raw: Record<string, unknown>, ctx = mockContext) =>
    GoogleGke.actions[action].handler(ctx, parse(action, raw));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('spec', () => {
    it('is wired into all_specs', () => {
      expect(getConnectorSpec('.google_gke')).toBe(GoogleGke);
    });

    it('has the expected metadata and reuses the shared GCP service account auth type', () => {
      expect(GoogleGke.metadata.id).toBe('.google_gke');
      expect(GoogleGke.metadata.displayName).toBe('Google Kubernetes Engine');
      expect(GoogleGke.metadata.minimumLicense).toBe('enterprise');
      expect(GoogleGke.metadata.isTechnicalPreview).toBe(true);
      expect(GoogleGke.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(GoogleGke.auth?.types).toEqual(['gcp_service_account']);
      expect(GoogleGke.test?.enabled).toBe(true);
    });

    it('gives every action a description and an explicit scope', () => {
      for (const action of Object.values(GoogleGke.actions)) {
        expect(['read', 'write', 'destroy']).toContain(action.scope);
        expect(typeof action.description).toBe('string');
        expect(action.description?.length).toBeGreaterThan(40);
      }
    });

    it('keeps cluster provisioning and deletion out of the agent tool set', () => {
      const workflowOnly = Object.entries(GoogleGke.actions)
        .filter(([, action]) => action.isTool === false)
        .map(([name]) => name)
        .sort();
      expect(workflowOnly).toEqual(['createCluster', 'deleteCluster']);
    });

    it('classifies read-only actions as read', () => {
      for (const name of [
        'listClusters',
        'getCluster',
        'listNodePools',
        'getNodePool',
        'getServerConfig',
        'getOperation',
        'listOperations',
      ] as ActionName[]) {
        expect(GoogleGke.actions[name].scope).toBe('read');
      }
    });

    it('documents the async operation model and the hand-off to the Kubernetes connector', () => {
      expect(GoogleGke.skill).toContain('getOperation');
      expect(GoogleGke.skill).toContain('PER ZONE');
      expect(GoogleGke.skill).toContain('kubernetesConnector');
    });
  });

  describe('project and location resolution', () => {
    it('falls back to the service account project and the "-" wildcard for lists', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      const result = await run('listClusters', {});
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${SA_PROJECT}/locations/-/clusters`
      );
      expect(result).toEqual({
        projectId: SA_PROJECT,
        location: '-',
        clusters: [],
        missingZones: [],
      });
    });

    it('prefers the connector defaults over the service account project', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await run(
        'listClusters',
        {},
        withConfig({ defaultProjectId: PROJECT, defaultLocation: 'us-central1' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/locations/us-central1/clusters`
      );
    });

    it('prefers an explicit input over every default', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await run(
        'listClusters',
        { projectId: 'other-project-9', location: 'europe-west1' },
        withConfig({ defaultProjectId: PROJECT, defaultLocation: 'us-central1' })
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/other-project-9/locations/europe-west1/clusters`
      );
    });

    it('fails clearly when no project can be resolved', async () => {
      const ctx = { ...mockContext, secrets: {} } as unknown as ActionContext;
      await expect(run('listClusters', {}, ctx)).rejects.toThrow(
        'No Google Cloud project id available'
      );
    });

    it('requires a concrete location for cluster-scoped actions', async () => {
      await expect(run('getCluster', { clusterId: 'prod-web' })).rejects.toThrow(
        'No location available'
      );
      await expect(run('getCluster', { clusterId: 'prod-web', location: '-' })).rejects.toThrow(
        'needs a concrete zone or region'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('rejects malformed ids before any request is made', () => {
      expect(() => parse('getCluster', { location: ZONE, clusterId: 'Prod Web' })).toThrow();
      expect(() => parse('getCluster', { location: 'nowhere', clusterId: 'prod-web' })).toThrow();
      expect(() =>
        parse('listClusters', { projectId: 'has spaces and is way too long for gcp' })
      ).toThrow();
    });
  });

  describe('discovery', () => {
    it('listClusters trims each cluster to a summary and reports missing zones', async () => {
      mockClient.get.mockResolvedValue({
        data: { clusters: [sampleCluster], missingZones: ['us-central1-f'] },
      });
      const result = await run('listClusters', { projectId: PROJECT, location: ZONE });
      expect(result).toMatchObject({
        location: ZONE,
        missingZones: ['us-central1-f'],
        clusters: [
          {
            name: 'prod-web',
            location: ZONE,
            status: 'RUNNING',
            autopilot: false,
            currentMasterVersion: '1.35.7-gke.1027000',
            currentNodeCount: 2,
            releaseChannel: 'REGULAR',
            endpoint: '203.0.113.10',
            nodePoolCount: 1,
          },
        ],
      });
      const [cluster] = (result as { clusters: Array<Record<string, unknown>> }).clusters;
      expect(cluster).not.toHaveProperty('nodePools');
      expect(cluster).not.toHaveProperty('kubernetesConnector');
    });

    it('getCluster returns policy state and the Kubernetes connector hand-off with a PEM CA', async () => {
      mockClient.get.mockResolvedValue({ data: sampleCluster });
      const result = await run('getCluster', {
        projectId: PROJECT,
        location: ZONE,
        clusterId: 'prod-web',
      });
      expect(mockClient.get).toHaveBeenCalledWith(CLUSTER);
      expect(result).toMatchObject({
        name: 'prod-web',
        etag: 'cluster-etag',
        controlPlane: {
          publicEndpoint: '203.0.113.10',
          privateEndpoint: '10.0.0.2',
          dnsEndpoint: 'gke-abc.us-central1-a.gke.goog',
        },
        kubernetesConnector: {
          apiUrl: 'https://203.0.113.10',
          dnsApiUrl: 'https://gke-abc.us-central1-a.gke.goog',
          caCertificatePem: CA_PEM,
          authType: 'kubernetes_gke',
        },
        networkPolicy: { enabled: true, provider: 'CALICO' },
        masterAuthorizedNetworks: {
          enabled: true,
          cidrBlocks: [{ cidrBlock: '198.51.100.0/24', displayName: 'office' }],
          gcpPublicCidrsAccessEnabled: true,
        },
        binaryAuthorization: { evaluationMode: 'DISABLED' },
        workloadIdentityPool: 'my-project-123.svc.id.goog',
        nodePools: [{ name: 'default-pool', nodeCountPerZone: 2, totalNodeCount: 6 }],
      });
    });

    it('getCluster derives the Binary Authorization mode from the legacy enabled flag', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...sampleCluster, binaryAuthorization: { enabled: true } },
      });
      const result = await run('getCluster', { location: ZONE, clusterId: 'prod-web' });
      expect(result).toMatchObject({
        binaryAuthorization: { evaluationMode: 'PROJECT_SINGLETON_POLICY_ENFORCE' },
      });
    });

    it('listNodePools and getNodePool trim pools and compute the total node count', async () => {
      mockClient.get.mockResolvedValue({ data: { nodePools: [samplePool] } });
      const list = await run('listNodePools', {
        projectId: PROJECT,
        location: ZONE,
        clusterId: 'prod-web',
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${CLUSTER}/nodePools`);
      expect(list).toEqual({
        nodePools: [
          expect.objectContaining({
            name: 'default-pool',
            nodeCountPerZone: 2,
            totalNodeCount: 6,
            machineType: 'e2-standard-4',
            spot: false,
            preemptible: false,
            autoscaling: expect.objectContaining({
              enabled: true,
              minNodeCount: 1,
              maxNodeCount: 5,
            }),
            management: { autoRepair: true, autoUpgrade: true },
            maxPodsPerNode: '110',
          }),
        ],
      });

      mockClient.get.mockResolvedValue({ data: samplePool });
      const single = await run('getNodePool', {
        projectId: PROJECT,
        location: ZONE,
        clusterId: 'prod-web',
        nodePoolId: 'default-pool',
      });
      expect(mockClient.get).toHaveBeenLastCalledWith(POOL);
      expect(single).toMatchObject({ name: 'default-pool', etag: 'pool-etag' });
    });

    it('getServerConfig returns valid versions per channel', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          defaultClusterVersion: '1.34.9-gke.1610001',
          validMasterVersions: ['1.35.7-gke.1027000', '1.34.9-gke.1610001'],
          validNodeVersions: ['1.35.7-gke.1027000'],
          defaultImageType: 'COS_CONTAINERD',
          validImageTypes: ['COS_CONTAINERD', 'UBUNTU_CONTAINERD'],
          channels: [
            {
              channel: 'REGULAR',
              defaultVersion: '1.34.9-gke.1610001',
              validVersions: ['1.34.9-gke.1610001'],
              upgradeTargetVersion: '1.35.7-gke.1027000',
            },
          ],
        },
      });
      const result = await run('getServerConfig', { projectId: PROJECT, location: ZONE });
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/locations/${ZONE}/serverConfig`
      );
      expect(result).toEqual({
        location: ZONE,
        defaultClusterVersion: '1.34.9-gke.1610001',
        validMasterVersions: ['1.35.7-gke.1027000', '1.34.9-gke.1610001'],
        validNodeVersions: ['1.35.7-gke.1027000'],
        defaultImageType: 'COS_CONTAINERD',
        validImageTypes: ['COS_CONTAINERD', 'UBUNTU_CONTAINERD'],
        channels: [
          {
            channel: 'REGULAR',
            defaultVersion: '1.34.9-gke.1610001',
            upgradeTargetVersion: '1.35.7-gke.1027000',
            validVersions: ['1.34.9-gke.1610001'],
          },
        ],
      });
    });
  });

  describe('operations', () => {
    const OPERATION = `${API}/projects/${PROJECT}/locations/${ZONE}/operations/${OPERATION_ID}`;

    it('getOperation trims the operation and derives done and location', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...sampleOperation, status: 'DONE', endTime: '2026-09-03T08:03:00Z' },
      });
      const result = await run('getOperation', {
        projectId: PROJECT,
        location: ZONE,
        operationId: OPERATION_ID,
      });
      expect(mockClient.get).toHaveBeenCalledWith(OPERATION);
      expect(result).toMatchObject({
        operationId: OPERATION_ID,
        operationType: 'SET_NODE_POOL_SIZE',
        status: 'DONE',
        done: true,
        location: ZONE,
        target: 'default-pool',
        error: undefined,
        progress: { status: 'RUNNING', metrics: [{ name: 'NODES_DONE', value: '1' }] },
      });
    });

    it('getOperation surfaces a failed operation error', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          ...sampleOperation,
          status: 'DONE',
          error: { code: 9, message: 'Insufficient quota' },
        },
      });
      const result = await run('getOperation', { location: ZONE, operationId: OPERATION_ID });
      expect(result).toMatchObject({
        done: true,
        error: { code: 9, message: 'Insufficient quota' },
      });
    });

    it('listOperations lists across all locations by default', async () => {
      mockClient.get.mockResolvedValue({ data: { operations: [sampleOperation] } });
      const result = await run('listOperations', { projectId: PROJECT });
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/locations/-/operations`
      );
      expect(result).toEqual({
        operations: [expect.objectContaining({ operationId: OPERATION_ID, done: false })],
        missingZones: [],
      });
    });

    it('cancelOperation posts to :cancel', async () => {
      mockClient.post.mockResolvedValue({ data: {} });
      const result = await run('cancelOperation', {
        projectId: PROJECT,
        location: ZONE,
        operationId: OPERATION_ID,
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${OPERATION}:cancel`, {});
      expect(result).toEqual({ cancelRequested: true, operationId: OPERATION_ID, location: ZONE });
    });
  });

  describe('node pool mutations', () => {
    const poolRef = {
      projectId: PROJECT,
      location: ZONE,
      clusterId: 'prod-web',
      nodePoolId: 'default-pool',
    };

    it('setNodePoolSize posts the node count and returns the trimmed operation', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      const result = await run('setNodePoolSize', { ...poolRef, nodeCount: 4 });
      expect(mockClient.post).toHaveBeenCalledWith(`${POOL}:setSize`, { nodeCount: 4 });
      expect(result).toMatchObject({ operationId: OPERATION_ID, status: 'RUNNING', done: false });
    });

    it('setNodePoolSize rejects a negative or fractional count', () => {
      expect(() => parse('setNodePoolSize', { ...poolRef, nodeCount: -1 })).toThrow();
      expect(() => parse('setNodePoolSize', { ...poolRef, nodeCount: 1.5 })).toThrow();
    });

    it('setNodePoolAutoscaling sends per-zone bounds when enabling', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('setNodePoolAutoscaling', {
        ...poolRef,
        enabled: true,
        minNodeCount: 1,
        maxNodeCount: 6,
        locationPolicy: 'ANY',
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${POOL}:setAutoscaling`, {
        autoscaling: {
          enabled: true,
          minNodeCount: 1,
          maxNodeCount: 6,
          totalMinNodeCount: undefined,
          totalMaxNodeCount: undefined,
          locationPolicy: 'ANY',
        },
      });
    });

    it('setNodePoolAutoscaling sends only enabled:false when disabling', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('setNodePoolAutoscaling', { ...poolRef, enabled: false });
      expect(mockClient.post).toHaveBeenCalledWith(`${POOL}:setAutoscaling`, {
        autoscaling: { enabled: false },
      });
    });

    it('setNodePoolAutoscaling validates the bound families', () => {
      expect(() => parse('setNodePoolAutoscaling', { ...poolRef, enabled: true })).toThrow(
        'provide either minNodeCount and maxNodeCount'
      );
      expect(() =>
        parse('setNodePoolAutoscaling', {
          ...poolRef,
          enabled: true,
          minNodeCount: 1,
          maxNodeCount: 3,
          totalMaxNodeCount: 9,
        })
      ).toThrow('not both');
      expect(() =>
        parse('setNodePoolAutoscaling', {
          ...poolRef,
          enabled: true,
          minNodeCount: 5,
          maxNodeCount: 3,
        })
      ).toThrow('must not exceed the maximum');
      expect(() =>
        parse('setNodePoolAutoscaling', {
          ...poolRef,
          enabled: true,
          totalMinNodeCount: 0,
          totalMaxNodeCount: 9,
        })
      ).not.toThrow();
    });

    it('setNodePoolManagement reads the pool and backfills the omitted flag', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...samplePool, management: { autoRepair: false, autoUpgrade: true } },
      });
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('setNodePoolManagement', { ...poolRef, autoRepair: true });
      expect(mockClient.get).toHaveBeenCalledWith(POOL);
      expect(mockClient.post).toHaveBeenCalledWith(`${POOL}:setManagement`, {
        management: { autoRepair: true, autoUpgrade: true },
      });
    });

    it('setNodePoolManagement requires at least one flag', () => {
      expect(() => parse('setNodePoolManagement', poolRef)).toThrow('Provide autoRepair');
    });

    it('rollbackNodePoolUpgrade posts to :rollback with respectPdb when given', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('rollbackNodePoolUpgrade', poolRef);
      expect(mockClient.post).toHaveBeenCalledWith(`${POOL}:rollback`, {});
      await run('rollbackNodePoolUpgrade', { ...poolRef, respectPdb: true });
      expect(mockClient.post).toHaveBeenLastCalledWith(`${POOL}:rollback`, { respectPdb: true });
    });

    it('createNodePool builds the NodePool body the API expects', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('createNodePool', {
        projectId: PROJECT,
        location: ZONE,
        clusterId: 'prod-web',
        nodePoolId: 'batch-pool',
        initialNodeCount: 2,
        machineType: 'e2-standard-8',
        diskSizeGb: 50,
        diskType: 'pd-ssd',
        spot: true,
        labels: { workload: 'batch' },
        taints: [{ key: 'dedicated', value: 'batch', effect: 'NO_SCHEDULE' }],
        resourceManagerTags: { '123456789/env': 'staging' },
        autoscaling: { enabled: true, totalMinNodeCount: 0, totalMaxNodeCount: 10 },
        autoRepair: true,
        maxSurge: 2,
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${CLUSTER}/nodePools`, {
        nodePool: {
          name: 'batch-pool',
          initialNodeCount: 2,
          version: undefined,
          locations: undefined,
          config: {
            machineType: 'e2-standard-8',
            diskSizeGb: 50,
            diskType: 'pd-ssd',
            imageType: undefined,
            spot: true,
            serviceAccount: undefined,
            labels: { workload: 'batch' },
            taints: [{ key: 'dedicated', value: 'batch', effect: 'NO_SCHEDULE' }],
            resourceManagerTags: { tags: { '123456789/env': 'staging' } },
          },
          autoscaling: {
            enabled: true,
            minNodeCount: undefined,
            maxNodeCount: undefined,
            totalMinNodeCount: 0,
            totalMaxNodeCount: 10,
            locationPolicy: undefined,
          },
          management: { autoRepair: true, autoUpgrade: true },
          upgradeSettings: { maxSurge: 2, maxUnavailable: undefined },
        },
      });
    });

    it('trims a pool whose autoscaler omits the zero minimum', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...samplePool, autoscaling: { enabled: true, totalMaxNodeCount: 2 } },
      });
      const result = await run('getNodePool', poolRef);
      expect(result).toMatchObject({
        autoscaling: {
          enabled: true,
          totalMinNodeCount: 0,
          totalMaxNodeCount: 2,
          minNodeCount: undefined,
          maxNodeCount: undefined,
        },
      });
    });

    it('createNodePool omits management and upgrade settings when not requested', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('createNodePool', {
        location: ZONE,
        clusterId: 'prod-web',
        nodePoolId: 'plain-pool',
        initialNodeCount: 1,
      });
      const [, body] = mockClient.post.mock.calls[0];
      expect(body.nodePool.management).toBeUndefined();
      expect(body.nodePool.upgradeSettings).toBeUndefined();
      expect(body.nodePool.autoscaling).toBeUndefined();
    });

    it('deleteNodePool issues a DELETE on the pool', async () => {
      mockClient.delete.mockResolvedValue({
        data: { ...sampleOperation, operationType: 'DELETE_NODE_POOL' },
      });
      const result = await run('deleteNodePool', poolRef);
      expect(mockClient.delete).toHaveBeenCalledWith(POOL);
      expect(result).toMatchObject({ operationType: 'DELETE_NODE_POOL' });
    });
  });

  describe('cluster configuration', () => {
    const clusterRef = { projectId: PROJECT, location: ZONE, clusterId: 'prod-web' };

    it('updateCluster PUTs a ClusterUpdate with only the requested fields', async () => {
      mockClient.put.mockResolvedValue({
        data: { ...sampleOperation, operationType: 'UPGRADE_MASTER' },
      });
      await run('updateCluster', {
        ...clusterRef,
        desiredMasterVersion: '1.35.7-gke.1027000',
        desiredReleaseChannel: 'STABLE',
        etag: 'cluster-etag',
      });
      expect(mockClient.put).toHaveBeenCalledWith(CLUSTER, {
        update: {
          desiredMasterVersion: '1.35.7-gke.1027000',
          desiredNodeVersion: undefined,
          desiredNodePoolId: undefined,
          desiredImageType: undefined,
          desiredLocations: undefined,
          desiredReleaseChannel: { channel: 'STABLE' },
          desiredMonitoringService: undefined,
          desiredLoggingService: undefined,
          etag: 'cluster-etag',
        },
      });
    });

    it('updateCluster backfills the sibling logging/monitoring service from the cluster', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          ...sampleCluster,
          loggingService: 'logging.googleapis.com/kubernetes',
          monitoringService: 'monitoring.googleapis.com/kubernetes',
        },
      });
      mockClient.put.mockResolvedValue({ data: sampleOperation });
      await run('updateCluster', { ...clusterRef, desiredLoggingService: 'none' });
      expect(mockClient.get).toHaveBeenCalledWith(CLUSTER);
      expect(mockClient.put).toHaveBeenCalledWith(
        CLUSTER,
        expect.objectContaining({
          update: expect.objectContaining({
            desiredLoggingService: 'none',
            desiredMonitoringService: 'monitoring.googleapis.com/kubernetes',
          }),
        })
      );

      mockClient.get.mockClear();
      await run('updateCluster', { ...clusterRef, desiredMasterVersion: '1.35' });
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('updateCluster requires at least one change and a pool for pool-scoped changes', () => {
      expect(() => parse('updateCluster', clusterRef)).toThrow('at least one desired');
      expect(() =>
        parse('updateCluster', { ...clusterRef, desiredNodePoolId: 'default-pool' })
      ).toThrow('desiredNodePoolId only makes sense');
      expect(() =>
        parse('updateCluster', { ...clusterRef, desiredMasterVersion: 'v1;rm -rf' })
      ).toThrow();
      expect(() =>
        parse('updateCluster', {
          ...clusterRef,
          desiredNodeVersion: '1.35',
          desiredNodePoolId: 'default-pool',
        })
      ).not.toThrow();
    });

    it('setNetworkPolicy enables the addon first when it is off', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          ...sampleCluster,
          networkPolicy: undefined,
          addonsConfig: { networkPolicyConfig: { disabled: true } },
        },
      });
      mockClient.put.mockResolvedValue({ data: sampleOperation });
      const result = await run('setNetworkPolicy', { ...clusterRef, enabled: true });
      expect(mockClient.put).toHaveBeenCalledWith(CLUSTER, {
        update: { desiredAddonsConfig: { networkPolicyConfig: { disabled: false } } },
      });
      expect(mockClient.post).not.toHaveBeenCalled();
      expect(result).toMatchObject({ operationId: OPERATION_ID, phase: 'addon' });
      expect((result as { nextStep?: string }).nextStep).toContain('setNetworkPolicy again');
    });

    it('setNetworkPolicy enforces on the nodes once the addon is on, defaulting to CALICO', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          ...sampleCluster,
          networkPolicy: undefined,
          addonsConfig: { networkPolicyConfig: {} },
        },
      });
      mockClient.post.mockResolvedValue({
        data: { ...sampleOperation, operationType: 'SET_NETWORK_POLICY' },
      });
      const result = await run('setNetworkPolicy', { ...clusterRef, enabled: true });
      expect(mockClient.post).toHaveBeenCalledWith(`${CLUSTER}:setNetworkPolicy`, {
        networkPolicy: { enabled: true, provider: 'CALICO' },
      });
      expect(mockClient.put).not.toHaveBeenCalled();
      expect(result).toMatchObject({ phase: 'nodes', operationType: 'SET_NETWORK_POLICY' });
    });

    it('setNetworkPolicy reports done when the cluster is already in the desired state', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...sampleCluster, addonsConfig: { networkPolicyConfig: {} } },
      });
      const result = await run('setNetworkPolicy', { ...clusterRef, enabled: true });
      expect(result).toEqual({ phase: 'done', enabled: true, done: true });
      expect(mockClient.post).not.toHaveBeenCalled();
      expect(mockClient.put).not.toHaveBeenCalled();
    });

    it('setNetworkPolicy disables enforcement on the nodes before the addon', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...sampleCluster, addonsConfig: { networkPolicyConfig: {} } },
      });
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      const first = await run('setNetworkPolicy', { ...clusterRef, enabled: false });
      expect(mockClient.post).toHaveBeenCalledWith(`${CLUSTER}:setNetworkPolicy`, {
        networkPolicy: { enabled: false, provider: 'CALICO' },
      });
      expect(first).toMatchObject({ phase: 'nodes' });

      mockClient.get.mockResolvedValue({
        data: {
          ...sampleCluster,
          networkPolicy: { provider: 'CALICO', enabled: false },
          addonsConfig: { networkPolicyConfig: {} },
        },
      });
      mockClient.put.mockResolvedValue({ data: sampleOperation });
      const second = await run('setNetworkPolicy', { ...clusterRef, enabled: false });
      expect(mockClient.put).toHaveBeenCalledWith(CLUSTER, {
        update: { desiredAddonsConfig: { networkPolicyConfig: { disabled: true } } },
      });
      expect(second).toMatchObject({ phase: 'addon' });
    });

    it('setBinaryAuthorization updates the evaluation mode through a cluster update', async () => {
      mockClient.put.mockResolvedValue({ data: sampleOperation });
      await run('setBinaryAuthorization', {
        ...clusterRef,
        evaluationMode: 'PROJECT_SINGLETON_POLICY_ENFORCE',
      });
      expect(mockClient.put).toHaveBeenCalledWith(CLUSTER, {
        update: {
          desiredBinaryAuthorization: { evaluationMode: 'PROJECT_SINGLETON_POLICY_ENFORCE' },
        },
      });
    });

    it('setMasterAuthorizedNetworks reads the cluster to keep the public CIDR flag', async () => {
      mockClient.get.mockResolvedValue({ data: sampleCluster });
      mockClient.put.mockResolvedValue({ data: sampleOperation });
      await run('setMasterAuthorizedNetworks', {
        ...clusterRef,
        enabled: true,
        cidrBlocks: [{ cidrBlock: '203.0.113.0/24', displayName: 'vpn' }],
      });
      expect(mockClient.get).toHaveBeenCalledWith(CLUSTER);
      expect(mockClient.put).toHaveBeenCalledWith(CLUSTER, {
        update: {
          desiredMasterAuthorizedNetworksConfig: {
            enabled: true,
            cidrBlocks: [{ cidrBlock: '203.0.113.0/24', displayName: 'vpn' }],
            gcpPublicCidrsAccessEnabled: true,
          },
        },
      });
    });

    it('setMasterAuthorizedNetworks skips the read when the flag is given and clears CIDRs on disable', async () => {
      mockClient.put.mockResolvedValue({ data: sampleOperation });
      await run('setMasterAuthorizedNetworks', {
        ...clusterRef,
        enabled: false,
        gcpPublicCidrsAccessEnabled: false,
      });
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.put).toHaveBeenCalledWith(CLUSTER, {
        update: {
          desiredMasterAuthorizedNetworksConfig: {
            enabled: false,
            cidrBlocks: [],
            gcpPublicCidrsAccessEnabled: false,
          },
        },
      });
    });

    it('setMasterAuthorizedNetworks requires CIDRs when enabling and validates them', () => {
      expect(() => parse('setMasterAuthorizedNetworks', { ...clusterRef, enabled: true })).toThrow(
        'at least one cidrBlock'
      );
      expect(() =>
        parse('setMasterAuthorizedNetworks', {
          ...clusterRef,
          enabled: true,
          cidrBlocks: [{ cidrBlock: 'not-a-cidr' }],
        })
      ).toThrow();
    });
  });

  describe('cluster lifecycle', () => {
    it('createCluster builds a Standard cluster with a default pool', async () => {
      mockClient.post.mockResolvedValue({
        data: { ...sampleOperation, operationType: 'CREATE_CLUSTER' },
      });
      await run('createCluster', {
        projectId: PROJECT,
        location: 'us-central1',
        clusterId: 'staging',
        initialNodeCount: 2,
        machineType: 'e2-standard-4',
        releaseChannel: 'REGULAR',
        network: 'default',
        enableWorkloadIdentity: true,
        enableNetworkPolicy: true,
        resourceLabels: { env: 'staging' },
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/locations/us-central1/clusters`,
        {
          cluster: {
            name: 'staging',
            description: undefined,
            locations: undefined,
            initialClusterVersion: undefined,
            releaseChannel: { channel: 'REGULAR' },
            network: 'default',
            subnetwork: undefined,
            resourceLabels: { env: 'staging' },
            workloadIdentityConfig: { workloadPool: `${PROJECT}.svc.id.goog` },
            nodePools: [
              {
                name: 'default-pool',
                initialNodeCount: 2,
                config: {
                  machineType: 'e2-standard-4',
                  diskSizeGb: undefined,
                  resourceManagerTags: undefined,
                },
              },
            ],
            networkPolicy: { enabled: true, provider: 'CALICO' },
            addonsConfig: { networkPolicyConfig: { disabled: false } },
          },
        }
      );
    });

    it('createCluster builds an Autopilot cluster without node pools', async () => {
      mockClient.post.mockResolvedValue({ data: sampleOperation });
      await run('createCluster', {
        location: 'us-central1',
        clusterId: 'auto',
        autopilot: true,
      });
      const [, body] = mockClient.post.mock.calls[0];
      expect(body.cluster.autopilot).toEqual({ enabled: true });
      expect(body.cluster.nodePools).toBeUndefined();
      expect(() =>
        parse('createCluster', {
          location: 'us-central1',
          clusterId: 'auto',
          autopilot: true,
          machineType: 'e2-standard-4',
        })
      ).toThrow('do not apply to Autopilot');
    });

    it('deleteCluster refuses to run without a matching confirmation', async () => {
      expect(() =>
        parse('deleteCluster', {
          location: ZONE,
          clusterId: 'prod-web',
          confirmClusterId: 'prod-wed',
        })
      ).toThrow('confirmClusterId must match clusterId');
      mockClient.delete.mockResolvedValue({
        data: { ...sampleOperation, operationType: 'DELETE_CLUSTER' },
      });
      const result = await run('deleteCluster', {
        projectId: PROJECT,
        location: ZONE,
        clusterId: 'prod-web',
        confirmClusterId: 'prod-web',
      });
      expect(mockClient.delete).toHaveBeenCalledWith(CLUSTER);
      expect(result).toMatchObject({ operationType: 'DELETE_CLUSTER' });
    });
  });

  describe('errors', () => {
    it("surfaces Google's structured error message", async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: {
              code: 400,
              status: 'FAILED_PRECONDITION',
              message: 'Cluster is running incompatible operation operation-123.',
            },
          },
        },
      });
      await expect(
        run('setNodePoolSize', {
          location: ZONE,
          clusterId: 'prod-web',
          nodePoolId: 'default-pool',
          nodeCount: 3,
        })
      ).rejects.toThrow(
        'Google Kubernetes Engine API error (400) [FAILED_PRECONDITION]: Cluster is running incompatible operation operation-123.'
      );
    });

    it('stringifies an unstructured error body and rethrows network errors', async () => {
      mockClient.get.mockRejectedValue({ response: { status: 502, data: 'bad gateway' } });
      await expect(run('listClusters', {})).rejects.toThrow(
        'Google Kubernetes Engine API error (502): "bad gateway"'
      );
      const networkError = new Error('socket hang up');
      mockClient.get.mockRejectedValue(networkError);
      await expect(run('listClusters', {})).rejects.toBe(networkError);
    });
  });

  describe('test handler', () => {
    const runTest = () => {
      const handler = GoogleGke.test?.handler;
      if (!handler) {
        throw new Error('test handler is not defined');
      }
      return handler(mockContext);
    };

    it('lists clusters across the project and reports the count', async () => {
      mockClient.get.mockResolvedValue({ data: { clusters: [sampleCluster] } });
      const result = await runTest();
      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${SA_PROJECT}/locations/-/clusters`
      );
      expect(result).toEqual({
        message: `Connected to Google Kubernetes Engine: 1 cluster(s) visible in project ${SA_PROJECT} (location -).`,
      });
    });

    it('throws on an authorization failure', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              status: 'PERMISSION_DENIED',
              message: 'Required "container.clusters.list" permission(s)',
            },
          },
        },
      });
      await expect(runTest()).rejects.toThrow(
        'Google Kubernetes Engine API error (403) [PERMISSION_DENIED]'
      );
    });
  });
});
