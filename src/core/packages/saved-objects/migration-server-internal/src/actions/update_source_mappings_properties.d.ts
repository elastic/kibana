/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IncompatibleMappingException } from './update_mappings';
/** @internal */
export interface UpdateSourceMappingsPropertiesParams {
  client: ElasticsearchClient;
  sourceIndex: string;
  indexMappings: IndexMapping;
  appMappings: IndexMapping;
  indexTypes: string[];
  latestMappingsVersions: VirtualVersionMap;
  hashToVersionMap: Record<string, string>;
}
/**
 * This action tries to update the source mappings properties if there are any changes.
 * @internal
 */
export declare const updateSourceMappingsProperties: ({
  client,
  sourceIndex,
  indexMappings,
  appMappings,
  indexTypes,
  latestMappingsVersions,
  hashToVersionMap,
}: UpdateSourceMappingsPropertiesParams) => TaskEither.TaskEither<
  RetryableEsClientError | IncompatibleMappingException,
  'update_mappings_succeeded'
>;
