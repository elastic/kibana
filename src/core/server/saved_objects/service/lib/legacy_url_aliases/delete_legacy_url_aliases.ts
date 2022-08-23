/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as esKuery from '@kbn/es-query';

import { getErrorMessage as getEsErrorMessage } from '@kbn/core-elasticsearch-client-server-internal';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  LEGACY_URL_ALIAS_TYPE,
  type IndexMapping,
} from '@kbn/core-saved-objects-base-server-internal';
import type { RepositoryEsClient } from '../repository_es_client';
import { getSearchDsl } from '../search_dsl';

/** @internal */
export interface DeleteLegacyUrlAliasesParams {
  mappings: IndexMapping;
  registry: ISavedObjectTypeRegistry;
  client: RepositoryEsClient;
  getIndexForType: (type: string) => string;
  /** The object type. */
  type: string;
  /** The object ID. */
  id: string;
  /**
   * The namespaces to include or exclude when searching for legacy URL alias targets (depends on the `deleteBehavior` parameter).
   * Note that using `namespaces: [], deleteBehavior: 'exclusive'` will delete all aliases for this object in all spaces.
   */
  namespaces: string[];
  /**
   * If this is equal to 'inclusive', all aliases with a `targetNamespace` in the `namespaces` array will be deleted.
   * If this is equal to 'exclusive', all aliases with a `targetNamespace` _not_ in the `namespaces` array will be deleted.
   */
  deleteBehavior: 'inclusive' | 'exclusive';
}

/**
 * Deletes legacy URL aliases that point to a given object.
 *
 * Note that aliases are only created when an object is converted to become share-capable, and each targetId is deterministically generated
 * with uuidv5 -- this means that the chances of there actually being _multiple_ legacy URL aliases that target a given type/ID are slim to
 * none. However, we don't always know exactly what space an alias could be in (if an object exists in multiple spaces, or in all spaces),
 * so the most straightforward way for us to ensure that aliases are reliably deleted is to use updateByQuery, which is what this function
 * does.
 *
 * @internal
 */
export async function deleteLegacyUrlAliases(params: DeleteLegacyUrlAliasesParams) {
  const { mappings, registry, client, getIndexForType, type, id, namespaces, deleteBehavior } =
    params;

  if (namespaces.includes(ALL_NAMESPACES_STRING)) {
    throwError(type, id, '"namespaces" cannot include the * string');
  }

  if (!namespaces.length && deleteBehavior === 'inclusive') {
    // nothing to do, return early
    return;
  }

  try {
    await client.updateByQuery(
      {
        index: getIndexForType(LEGACY_URL_ALIAS_TYPE),
        refresh: false, // This could be called many times in succession, intentionally do not wait for a refresh
        body: {
          ...getSearchDsl(mappings, registry, {
            type: LEGACY_URL_ALIAS_TYPE,
            kueryNode: createKueryNode(type, id),
          }),
          script: {
            // Intentionally use one script source with variable params to take advantage of ES script caching
            source: `
              if (params['namespaces'].indexOf(ctx._source['${LEGACY_URL_ALIAS_TYPE}']['targetNamespace']) > -1) {
                ctx.op = params['matchTargetNamespaceOp'];
              } else {
                ctx.op = params['notMatchTargetNamespaceOp'];
              }
            `,
            params: {
              namespaces,
              matchTargetNamespaceOp: deleteBehavior === 'inclusive' ? 'delete' : 'noop',
              notMatchTargetNamespaceOp: deleteBehavior === 'inclusive' ? 'noop' : 'delete',
            },
            lang: 'painless',
          },
          conflicts: 'proceed',
        },
      },
      { ignore: [404] }
    );
  } catch (err) {
    const errorMessage = getEsErrorMessage(err);
    throwError(type, id, `${errorMessage}`);
  }
}

function throwError(type: string, id: string, message: string) {
  throw new Error(`Failed to delete legacy URL aliases for ${type}/${id}: ${message}`);
}

function getKueryKey(attribute: string) {
  // Note: these node keys do NOT include '.attributes' for type-level fields because we are using the query in the ES client (instead of the SO client)
  return `${LEGACY_URL_ALIAS_TYPE}.${attribute}`;
}

export function createKueryNode(type: string, id: string) {
  const { buildNode } = esKuery.nodeTypes.function;
  // Escape Kuery values to prevent parsing errors and unintended behavior (object types/IDs can contain KQL special characters/operators)
  const match1 = buildNode('is', getKueryKey('targetType'), esKuery.escapeKuery(type));
  const match2 = buildNode('is', getKueryKey('targetId'), esKuery.escapeKuery(id));
  const kueryNode = buildNode('and', [match1, match2]);
  return kueryNode;
}
