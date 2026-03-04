/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type { ServiceGraph, ServiceNode } from '../types';
import { HEALTH_PROBS, LEVEL_RNG_SEED_OFFSET } from '../constants';
import { mulberry32 } from '../placeholders';
import type { MetadataCache } from '../utils/metadata';

export interface ServicePhaseOptions {
  service: ServiceNode;
  seed: number;
  cachedMetadata?: Record<string, string | undefined>;
  timestamp: number;
}

export interface ServiceGraphOptions {
  seed: number;
  timestamp: number;
  serviceGraph: ServiceGraph;
  metadataCache?: MetadataCache;
}

/**
 * Resolves the log level for a single tick given the current failure state.
 * Used by all log channels (infra, service, noise) so the probability model
 * is defined once and shared everywhere.
 */
export const resolveLogLevel = (
  isFailing: boolean,
  rng: () => number
): 'info' | 'warn' | 'error' => {
  const { error: errorThreshold, warn: warnThreshold } = isFailing
    ? HEALTH_PROBS.failing
    : HEALTH_PROBS.normal;
  const roll = rng();
  if (roll < errorThreshold) return 'error';
  if (roll < warnThreshold) return 'warn';
  return 'info';
};

export const resolveLogLevelFromSeed = (isFailing: boolean, seed: number) =>
  resolveLogLevel(isFailing, mulberry32(seed + LEVEL_RNG_SEED_OFFSET));

export const buildLogDoc = ({
  service,
  level,
  message,
  metadata,
}: {
  service: ServiceNode;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, string | undefined>;
}): Partial<LogDocument> => {
  return {
    'service.name': service.displayName ?? service.name,
    'service.version': service.version,
    'log.level': level,
    message,
    ...metadata,
  } as Partial<LogDocument>;
};
