/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Infrastructure pool for HTTP access logs.
 *
 * Pre-generates a stable set of hosts, pods, containers, and cloud metadata
 * so that logs reference the same infrastructure entities across the entire
 * scenario run, mimicking a real production deployment.
 */

import { CLOUD_PROVIDERS, CONTAINER_RUNTIMES, SERVICE_VERSIONS } from './http_field_generators';

interface CloudConfig {
  name: string;
  regions: string[];
  instanceTypes: string[];
}

interface HostIdentity {
  hostname: string;
  serviceName: string;
  serviceVersion: string;
  serviceEnvironment: string;
  deploymentName: string;
  cloud: {
    provider: string;
    region: string;
    availabilityZone: string;
    instanceId: string;
    instanceName: string;
    projectId: string;
  };
  kubernetes?: {
    namespace: string;
    podName: string;
    podUid: string;
    containerName: string;
    deploymentName: string;
    nodeName: string;
    labelsApp: string;
    labelsVersion: string;
    labelsTier: string;
  };
  container?: {
    id: string;
    name: string;
    imageName: string;
    imageTag: string;
    runtime: string;
  };
}

interface InfraPool {
  cloudConfig: CloudConfig;
  hosts: HostIdentity[];
}

/**
 * Coherent service archetypes. Each service has a matching deployment name,
 * container image, and K8s tier so the generated topology makes sense.
 */
const SERVICE_ARCHETYPES = [
  {
    name: 'web-frontend',
    deploymentName: 'web-frontend',
    containerImage: 'node',
    tier: 'frontend',
  },
  {
    name: 'api-gateway',
    deploymentName: 'api-gateway',
    containerImage: 'nginx',
    tier: 'frontend',
  },
  {
    name: 'mobile-api',
    deploymentName: 'mobile-api',
    containerImage: 'java',
    tier: 'backend',
  },
  {
    name: 'cdn',
    deploymentName: 'cdn',
    containerImage: 'nginx',
    tier: 'frontend',
  },
];

const K8S_NODE_COUNT = 5;

function stableRandomId(prefix: string, index: number): string {
  const hash = `${prefix}${index}`.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);
  return Math.abs(hash).toString(36).substring(0, 12);
}

function pickItem<T>(items: T[], index: number): T {
  return items[index % items.length];
}

let cachedPool: InfraPool | null = null;

/**
 * Initialize (or return cached) infrastructure pool.
 *
 * The pool picks a single cloud provider and generates a fixed set of
 * host identities that remain stable for the entire scenario run.
 * Pool size: `max(5, scale * 5)` hosts, capped at 100.
 *
 * Cloud provider selection is deterministic (based on `providerIndex`)
 * so that all worker threads in a multi-worker run produce the same
 * infrastructure topology. Once initialized, subsequent calls return
 * the cached pool regardless of arguments.
 */
export function getInfraPool(scale: number = 1, providerIndex: number = 0): InfraPool {
  if (cachedPool) {
    return cachedPool;
  }

  const cloudConfig = pickItem(CLOUD_PROVIDERS, Math.abs(providerIndex));

  const hostCount = Math.min(Math.max(5, scale * 5), 100);
  const projectId = `project-${stableRandomId('proj', 0)}`;

  const hosts: HostIdentity[] = [];

  // Pick a single stable version for the current deployment
  const currentVersion = pickItem(SERVICE_VERSIONS, providerIndex);

  for (let i = 0; i < hostCount; i++) {
    const archetype = pickItem(SERVICE_ARCHETYPES, i);
    const region = pickItem(cloudConfig.regions, i);
    const instanceType = pickItem(cloudConfig.instanceTypes, i);
    const instanceId = `i-${stableRandomId('inst', i)}`;
    const az = `${region}${pickItem(['a', 'b', 'c'], i)}`;

    // Production is the primary environment. At higher scales, the last
    // ~10% of hosts represent a staging environment.
    const isStaging = hostCount > 5 && i >= Math.floor(hostCount * 0.9);
    const environment = isStaging ? 'staging' : 'production';
    const namespace = isStaging ? 'staging' : 'production';

    const host: HostIdentity = {
      hostname: `${archetype.name}-${stableRandomId('host', i).substring(0, 6)}`,
      serviceName: archetype.name,
      serviceVersion: currentVersion,
      serviceEnvironment: environment,
      deploymentName: archetype.deploymentName,
      cloud: {
        provider: cloudConfig.name,
        region,
        availabilityZone: az,
        instanceId,
        instanceName: `${cloudConfig.name}-${instanceType}-${instanceId.substring(0, 10)}`,
        projectId,
      },
    };

    // 60% of hosts are on K8s
    if (i % 5 !== 0 && i % 5 !== 1) {
      const podId = stableRandomId('pod', i);
      host.kubernetes = {
        namespace,
        podName: `${archetype.name}-${podId}`,
        podUid: `uid-${podId}`,
        containerName: archetype.containerImage,
        deploymentName: `${archetype.deploymentName}-deployment`,
        nodeName: `node-${i % K8S_NODE_COUNT}`,
        labelsApp: archetype.name,
        labelsVersion: currentVersion,
        labelsTier: archetype.tier,
      };
    }

    // 70% of hosts are containerized
    if (i % 10 !== 0 && i % 10 !== 1 && i % 10 !== 2) {
      const containerId = stableRandomId('ctr', i);
      host.container = {
        id: containerId,
        name: `${archetype.containerImage}-${containerId.substring(0, 8)}`,
        imageName: archetype.containerImage,
        imageTag: currentVersion,
        runtime: pickItem(CONTAINER_RUNTIMES, i),
      };
    }

    hosts.push(host);
  }

  const pool: InfraPool = { cloudConfig, hosts };
  cachedPool = pool;
  return pool;
}

/**
 * Pick a random host from the infrastructure pool.
 */
export function getRandomHost(pool: InfraPool): HostIdentity {
  return pool.hosts[Math.floor(Math.random() * pool.hosts.length)];
}

/**
 * Convert a host identity into flat ECS fields for log documents.
 */
export function hostToLogFields(host: HostIdentity): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    hostname: host.hostname,
    'service.name': host.serviceName,
    'service.version': host.serviceVersion,
    'service.environment': host.serviceEnvironment,
    'deployment.name': host.deploymentName,
    'cloud.provider': host.cloud.provider,
    'cloud.region': host.cloud.region,
    'cloud.availability_zone': host.cloud.availabilityZone,
    'cloud.instance.id': host.cloud.instanceId,
    'cloud.instance.name': host.cloud.instanceName,
    'cloud.project.id': host.cloud.projectId,
  };

  if (host.kubernetes) {
    fields['kubernetes.namespace'] = host.kubernetes.namespace;
    fields['kubernetes.pod.name'] = host.kubernetes.podName;
    fields['kubernetes.pod.uid'] = host.kubernetes.podUid;
    fields['kubernetes.container.name'] = host.kubernetes.containerName;
    fields['kubernetes.deployment.name'] = host.kubernetes.deploymentName;
    fields['kubernetes.node.name'] = host.kubernetes.nodeName;
    fields['kubernetes.labels.app'] = host.kubernetes.labelsApp;
    fields['kubernetes.labels.version'] = host.kubernetes.labelsVersion;
    fields['kubernetes.labels.tier'] = host.kubernetes.labelsTier;
  }

  if (host.container) {
    fields['container.id'] = host.container.id;
    fields['container.name'] = host.container.name;
    fields['container.image.name'] = host.container.imageName;
    fields['container.image.tag'] = host.container.imageTag;
    fields['container.runtime'] = host.container.runtime;
  }

  return fields;
}

/**
 * Reset the cached pool (useful for tests or re-initialization).
 */
export function resetInfraPool(): void {
  cachedPool = null;
}
