/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as esKuery from '@kbn/es-query';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObjectsDeleteByNamespaceOptions } from '@kbn/core-saved-objects-api-server';
import {
  getRootPropertiesObjects,
  LEGACY_URL_ALIAS_TYPE,
} from '@kbn/core-saved-objects-base-server-internal';
import { getSearchDsl } from '../search';
import type { ApiExecutionContext } from './types';

export interface PerformDeleteByNamespaceParams<T = unknown> {
  namespace: string;
  options: SavedObjectsDeleteByNamespaceOptions;
}

export const performDeleteByNamespace = async <T>(
  { namespace, options }: PerformDeleteByNamespaceParams<T>,
  { registry, helpers, client, mappings, extensions = {} }: ApiExecutionContext
): Promise<any> => {
  const { common: commonHelper } = helpers;
  // This is not exposed on the SOC; authorization and audit logging is handled by the Spaces plugin
  if (!namespace || typeof namespace !== 'string' || namespace === '*') {
    throw new TypeError(`namespace is required, and must be a string that is not equal to '*'`);
  }

  const allTypes = Object.keys(getRootPropertiesObjects(mappings));
  const typesToUpdate = [
    ...allTypes.filter((type) => !registry.isNamespaceAgnostic(type)),
    LEGACY_URL_ALIAS_TYPE,
  ];

  // Construct kueryNode to filter legacy URL aliases (these space-agnostic objects do not use root-level "namespace/s" fields)
  const { buildNode } = esKuery.nodeTypes.function;
  const match1 = buildNode('is', `${LEGACY_URL_ALIAS_TYPE}.targetNamespace`, namespace);
  const match2 = buildNode('not', buildNode('is', 'type', LEGACY_URL_ALIAS_TYPE));
  const kueryNode = buildNode('or', [match1, match2]);

  const { body, statusCode, headers } = await client.updateByQuery(
    {
      index: commonHelper.getIndicesForTypes(typesToUpdate),
      refresh: options.refresh,
      body: {
        script: {
          source: `
              if (!ctx._source.containsKey('namespaces')) {
                ctx.op = "delete";
              } else {
                ctx._source['namespaces'].removeAll(Collections.singleton(params['namespace']));
                if (ctx._source['namespaces'].empty) {
                  ctx.op = "delete";
                }
              }
            `,
          lang: 'painless',
          params: { namespace },
        },
        conflicts: 'proceed',
        ...getSearchDsl(mappings, registry, {
          namespaces: [namespace],
          type: typesToUpdate,
          kueryNode,
        }),
      },
    },
    { ignore: [404], meta: true }
  );
  // throw if we can't verify a 404 response is from Elasticsearch
  if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  return body;
};
