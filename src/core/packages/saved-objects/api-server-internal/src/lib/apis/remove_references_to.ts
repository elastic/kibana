/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import { SavedObjectsErrorHelpers, SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import {
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsRemoveReferencesToResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { getSearchDsl } from '../search';
import type { ApiExecutionContext } from './types';

export interface PerformRemoveReferencesToParams {
  type: string;
  id: string;
  options: SavedObjectsRemoveReferencesToOptions;
}

export const performRemoveReferencesTo = async <T>(
  { type, id, options }: PerformRemoveReferencesToParams,
  { registry, helpers, client, mappings, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsRemoveReferencesToResponse> => {
  const { common: commonHelper } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const { refresh = true } = options;

  if (securityExtension) {
    let name;

    if (securityExtension.includeSavedObjectNames()) {
      const nameAttribute = registry.getNameAttribute(type);

      const savedObjectResponse = await client.get<SavedObjectsRawDocSource>(
        {
          index: commonHelper.getIndexForType(type),
          id: serializer.generateRawId(namespace, type, id),
          _source_includes: SavedObjectsUtils.getIncludedNameFields(type, nameAttribute),
        },
        { ignore: [404], meta: true }
      );

      const saveObject = { attributes: savedObjectResponse.body._source?.[type] };

      name = SavedObjectsUtils.getName(nameAttribute, saveObject);
    }

    await securityExtension.authorizeRemoveReferences({ namespace, object: { type, id, name } });
  }

  const allTypes = registry.getAllTypes().map((t) => t.name);

  // we need to target all SO indices as all types of objects may have references to the given SO.
  const targetIndices = commonHelper.getIndicesForTypes(allTypes);

  const { body, statusCode, headers } = await client.updateByQuery(
    {
      index: targetIndices,
      refresh,
      script: {
        source: `
          if (ctx._source.containsKey('references')) {
            def items_to_remove = [];
            for (item in ctx._source.references) {
              if ( (item['type'] == params['type']) && (item['id'] == params['id']) ) {
                items_to_remove.add(item);
              }
            }
            ctx._source.references.removeAll(items_to_remove);
          }
        `,
        params: {
          type,
          id,
        },
        lang: 'painless',
      },
      conflicts: 'proceed',
      ...(getSearchDsl(mappings, registry, {
        namespaces: namespace ? [namespace] : undefined,
        type: allTypes,
        hasReference: { type, id },
      }) as Omit<ReturnType<typeof getSearchDsl>, 'sort'>), // TS is complaining and it's unlikely that we sort here
    },
    { ignore: [404], meta: true }
  );
  // fail fast if we can't verify a 404 is from Elasticsearch
  if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
  }

  if (body.failures?.length) {
    throw SavedObjectsErrorHelpers.createConflictError(
      type,
      id,
      `${body.failures.length} references could not be removed`
    );
  }

  return {
    updated: body.updated!,
  };
};
