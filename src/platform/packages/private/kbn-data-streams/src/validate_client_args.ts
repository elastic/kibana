/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { DataStreamDefinition } from './types';

export function validateClientArgs(args: {
  dataStream: DataStreamDefinition<any, any, any>;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}) {
  if (args.dataStream.version <= 0) {
    throw new Error('Template version must be greater than 0');
  }
}
