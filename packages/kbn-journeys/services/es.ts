/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';

import { createEsClientForFtrConfig, ProvidedType } from '@kbn/test';
import { FtrProviderContext } from './ftr_context_provider';

export function EsProvider({ getService }: FtrProviderContext): Client {
  const config = getService('config');

  return createEsClientForFtrConfig(config);
}

export type Es = ProvidedType<typeof EsProvider>;
