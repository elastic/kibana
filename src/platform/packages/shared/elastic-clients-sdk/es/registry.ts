/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ApiRegistry, ApiRegistryDefinition, ApiRequest } from '../registry';
import { withApiId } from '../registry';
import { extractSchemaArgs } from '../lib/schema_args';
import { buildRequestParams as buildEsRequestParams } from './request_builder';
import { apiManifest, loadEsApi } from './apis';
import type { EsApiMeta } from './apis';

/** Registry over the Elasticsearch HTTP API surface. */
export const esApiRegistry: ApiRegistry<EsApiMeta & { readonly id: string }> = {
  manifest: withApiId(apiManifest),
  loadApi: async (meta) => {
    const def = await loadEsApi(meta);
    return {
      definition: def as ApiRegistryDefinition,
      buildRequest: (input): ApiRequest => {
        const schemaArgs = def.input != null ? extractSchemaArgs(def.input) : [];
        const p = buildEsRequestParams(def, input, schemaArgs);
        const req: {
          method: string;
          path: string;
          querystring?: Record<string, unknown>;
          body?: unknown;
          bulkBody?: unknown;
        } = { method: p.method as string, path: p.path as string };
        if (p.querystring != null) req.querystring = p.querystring as Record<string, unknown>;
        if (p.bulkBody != null) req.bulkBody = p.bulkBody;
        else if (p.body != null) req.body = p.body;
        return req;
      },
    };
  },
};
