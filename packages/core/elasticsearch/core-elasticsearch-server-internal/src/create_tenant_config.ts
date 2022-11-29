/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  TenantElasticsearchConfig,
  ElasticsearchClientConfig,
} from '@kbn/core-elasticsearch-server';
import { mergeConfig } from './merge_config';

export const createTenantConfig = (
  tenantConfig: TenantElasticsearchConfig,
  globalConfig: ElasticsearchClientConfig
): ElasticsearchClientConfig => {
  return mergeConfig(globalConfig, tenantConfig);
};
