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

export type MetadataCache = Map<string, Record<string, string | undefined>>;

export interface DeploymentMetadataOptions {
  service: ServiceNode;
  seed: number;
}

export function generateDeploymentMetadata(
  options: DeploymentMetadataOptions
): Record<string, string | undefined> {
  const { service, seed } = options;
  const overrides = service.deployment;
  const rng = mulberry32(seed);

  const base = {
    'os.type': overrides?.os?.type ?? 'linux',
    'os.name': overrides?.os?.name ?? 'Debian GNU/Linux',
    'os.version': overrides?.os?.version ?? '12 (bookworm)',
  };

  const metadata: Record<string, string | undefined> = { ...base };

  if (overrides?.container) {
    const containerName = overrides?.container?.name ?? `${service.name}-container`;
    Object.assign(metadata, {
      'container.name': containerName,
      'container.id': randHex(rng, 8),
    });
  }

  const hostName = `node-${service.name}`;
  if (overrides?.k8s) {
    const podName = `${service.name}-${randHex(rng, 6)}`;
    const k8s: Record<string, string | undefined> = {
      'k8s.namespace.name': overrides.k8s.namespace,
      'k8s.pod.name': podName,
      'k8s.node.name': hostName,
      'k8s.deployment.name': 'synth-deployment',
      'k8s.container.name': service.name,
      'k8s.pod.uid': randHex(rng, 8),
    };

    Object.assign(metadata, k8s);
  }

  Object.assign(metadata, {
    'host.name': hostName,
    'host.id': randHex(rng, 8),
  });

  return metadata;
}

export function buildMetadataCache(serviceGraph: ServiceGraph, seed?: number): MetadataCache {
  const cache: MetadataCache = new Map();
  for (let i = 0; i < serviceGraph.services.length; i++) {
    const service = serviceGraph.services[i];
    cache.set(service.name, generateDeploymentMetadata({ service, seed: (seed ?? 0) + i }));
  }
  return cache;
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
