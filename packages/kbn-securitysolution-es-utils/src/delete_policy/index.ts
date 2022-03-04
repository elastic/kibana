/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

export const deletePolicy = async (
  esClient: ElasticsearchClient,
  name: string
): Promise<unknown> => {
  return (await esClient.ilm.deleteLifecycle({ name }, { meta: true })).body;
};
