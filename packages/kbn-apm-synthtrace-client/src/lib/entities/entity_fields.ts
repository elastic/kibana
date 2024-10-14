/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';

export type EntityFields = Fields &
  Partial<{
    'agent.name': string[];
    'data_stream.type': string[];
    'event.ingested': string;
    sourceIndex: string[];
    'entity.firstSeenTimestamp': string;
    'entity.lastSeenTimestamp': string;
    'entity.schemaVersion': string;
    'entity.definitionVersion': string;
    'entity.displayName': string;
    'entity.identityFields': string[];
    'entity.metrics': Record<string, number>;
    'entity.id': string;
    'entity.type': string;
    'entity.definitionId': string;

    // Service entity fields
    'service.environment': string;
    'service.name': string;
    'service.runtime.name': string[];
    'service.runtime.version': string[];
    'service.language.name': string[];
    'service.version': string[];
    'entity.metrics.latency': number;
    'entity.metrics.logErrorRate': number;
    'entity.metrics.logRate': number;
    'entity.metrics.throughput': number;
    'entity.metrics.failedTransactionRate': number;
  }>;
