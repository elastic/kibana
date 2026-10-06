/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { DataIndexSchema } from './sample_dataset_registry_types';
export declare const insertDataIntoIndex: ({
  dataIndexConfig,
  logger,
  esClient,
  index,
  nowReference,
}: {
  dataIndexConfig: DataIndexSchema;
  index: string;
  nowReference: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}) => Promise<number>;
