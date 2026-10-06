/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
declare const methods: readonly [
  'bulk',
  'closePointInTime',
  'create',
  'delete',
  'get',
  'index',
  'mget',
  'openPointInTime',
  'search',
  'update',
  'updateByQuery'
];
type MethodName = (typeof methods)[number];
export type RepositoryEsClient = Pick<ElasticsearchClient, MethodName | 'transport'>;
export declare function createRepositoryEsClient(client: ElasticsearchClient): RepositoryEsClient;
export {};
