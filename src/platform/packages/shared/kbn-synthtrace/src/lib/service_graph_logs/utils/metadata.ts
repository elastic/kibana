/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceGraph, ServiceNode } from '../types';
import { mulberry32, randHex } from '../placeholders';
import { serviceStableSeed } from './seed';

export type MetadataCache = Map<string, Record<string, string | undefined>>;
export type Metadata = Record<string, string | undefined>;

export const isK8sService = (metadata: Metadata): boolean =>
  metadata['kubernetes.pod.name'] != null;

export const resolveOsType = (metadata: Metadata): string => metadata['host.os.type'] ?? 'linux';

export function generateDeploymentMetadata({
  service,
  seed,
}: {
  service: ServiceNode;
  seed: number;
}): Metadata {
  const deployment = service.deployment;
  const rng = mulberry32(seed);
  const hostName = `node-${service.name}`;

  const metadata: Metadata = {
    'host.os.type': deployment?.os?.type ?? 'linux',
    'host.os.name': deployment?.os?.name ?? 'Debian GNU/Linux',
    'host.os.version': deployment?.os?.version ?? '12 (bookworm)',
  };

  if (deployment?.container) {
    Object.assign(metadata, {
      'container.name': deployment.container.name ?? `${service.name}-container`,
      'container.id': randHex(rng, 8),
    });
  }

  if (deployment?.k8s) {
    Object.assign(metadata, {
      'kubernetes.namespace': deployment.k8s.namespace,
      'kubernetes.pod.name': `${service.name}-${randHex(rng, 6)}`,
      'kubernetes.node.name': hostName,
      'kubernetes.deployment.name': 'synth-deployment',
      'kubernetes.container.name': service.name,
      'kubernetes.pod.uid': randHex(rng, 8),
    });
  }

  Object.assign(metadata, {
    'host.name': hostName,
    'host.id': randHex(rng, 8),
  });
  return metadata;
}

export function buildMetadataCache(serviceGraph: ServiceGraph, seed?: number): MetadataCache {
  const cache: MetadataCache = new Map();
  for (const service of serviceGraph.services) {
    cache.set(
      service.name,
      generateDeploymentMetadata({ service, seed: serviceStableSeed(seed ?? 0, service.name) })
    );
  }
  return cache;
}

/** Maps deployment metadata fields to log template placeholder keys. */
export function buildMessageOverrides(metadata: Metadata): Record<string, string> {
  return {
    ...(metadata['kubernetes.pod.name'] && { pod_name: metadata['kubernetes.pod.name'] }),
    ...(metadata['kubernetes.namespace'] && { namespace: metadata['kubernetes.namespace'] }),
    ...(metadata['kubernetes.node.name'] && { node_name: metadata['kubernetes.node.name'] }),
    ...(metadata['kubernetes.container.name'] && {
      container_name: metadata['kubernetes.container.name'],
    }),
    ...(!metadata['kubernetes.node.name'] &&
      metadata['host.name'] && { node_name: metadata['host.name'] }),
  };
}

export function getOrBuildMetadata(
  service: ServiceNode,
  seed: number,
  cache?: MetadataCache
): Record<string, string | undefined> {
  if (!cache) return generateDeploymentMetadata({ service, seed });
  let entry = cache.get(service.name);
  if (!entry) {
    entry = generateDeploymentMetadata({ service, seed });
    cache.set(service.name, entry);
  }
  return entry;
}
