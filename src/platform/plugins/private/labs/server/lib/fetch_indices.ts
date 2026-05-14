/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

const isHidden = (index: IndicesIndexState) =>
  index.settings?.index?.hidden === true || index.settings?.index?.hidden === 'true';

const isClosed = (index: IndicesIndexState) =>
  index.settings?.index?.verified_before_close === true ||
  index.settings?.index?.verified_before_close === 'true';

export const fetchIndices = async (
  client: ElasticsearchClient,
  searchQuery?: string,
  { exact = false }: { exact?: boolean } = {}
): Promise<string[]> => {
  const indexPattern = exact && searchQuery ? searchQuery : searchQuery ? `*${searchQuery}*` : '*';
  const allIndexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    features: ['aliases', 'settings'],
    filter_path: ['*.aliases', '*.settings.index.hidden', '*.settings.index.verified_before_close'],
    index: indexPattern,
  });

  const allIndexNames = Object.keys(allIndexMatches).filter(
    (indexName) =>
      allIndexMatches[indexName] &&
      !isHidden(allIndexMatches[indexName]) &&
      !isClosed(allIndexMatches[indexName])
  );

  const allAliases = allIndexNames.reduce<string[]>((acc, indexName) => {
    const aliases = allIndexMatches[indexName].aliases;

    if (!aliases) {
      return acc;
    }

    Object.keys(aliases).forEach((alias) => {
      if (!acc.includes(alias)) {
        acc.push(alias);
      }
    });

    return acc;
  }, []);

  const allOptions = [...allIndexNames, ...allAliases];

  return searchQuery
    ? allOptions.filter((indexName) => indexName.includes(searchQuery.toLowerCase()))
    : allOptions;
};
