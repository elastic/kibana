/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndicesUpdateAliasesAction } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '../elasticsearch_client';

/**
 * Removes all but the specified alias from the concrete index(es) specified by said alias. Necessary when migrating an index to a data stream, as that index may only have one alias (name of data stream that going to be created)

 * @param alias The name of the alias to be preserved
 * @param esClient
 */
export const removeAliases = async (
  esClient: ElasticsearchClient,
  alias: string
): Promise<unknown> => {
  const response = await esClient.indices.getAlias({
    name: alias,
  });
  const indices = Object.keys(response);

  const indexAliasesList = await esClient.indices.getAlias({
    index: indices,
  });

  const aliasesToRemove: IndicesUpdateAliasesAction[] = [];
  const indexAliases = Object.entries(indexAliasesList);

  indexAliases.forEach(([indexName, aliases]) => {
    if (Object.keys(aliases.aliases).length === 1) {
      return;
    } else {
      const removeActions = Object.keys(aliases.aliases)
        .filter((a) => a !== alias)
        .map((a) => ({ remove: { alias: a, index: indexName } }));

      aliasesToRemove.push(...removeActions);
    }
  });

  // if all indices have only one alias, we don't need to remove any
  if (aliasesToRemove.length === 0) {
    return;
  }

  return esClient.indices.updateAliases({
    actions: aliasesToRemove,
  });
};
