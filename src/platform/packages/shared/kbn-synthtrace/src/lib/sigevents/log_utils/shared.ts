/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type { ServiceNode } from '../types';

export interface ServicePhaseOptions {
  service: ServiceNode;
  seed: number;
  cachedMetadata?: Record<string, string | undefined>;
  timestamp?: number;
}

export const buildLogDoc = ({
  service,
  level,
  message,
  metadata,
  extra,
}: {
  service: ServiceNode;
  level: string;
  message: string;
  metadata: Record<string, string | undefined>;
  extra?: Partial<LogDocument>;
}): Partial<LogDocument> => {
  return {
    'service.name': service.displayName ?? service.name,
    'service.version': service.version,
    'log.level': level,
    message,
    ...metadata,
    ...extra,
  } as Partial<LogDocument>;
};
