/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortBy } from 'lodash';
import { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Tag, INDEX_PATTERN_TYPE } from '../types';
import { MatchedItem, ResolveIndexResponse, ResolveIndexResponseItemIndexAttrs } from '../types';

const aliasLabel = i18n.translate('dataViews.aliasLabel', { defaultMessage: 'Alias' });
const dataStreamLabel = i18n.translate('dataViews.dataStreamLabel', {
  defaultMessage: 'Data stream',
});

const indexLabel = i18n.translate('dataViews.indexLabel', {
  defaultMessage: 'Index',
});

const frozenLabel = i18n.translate('dataViews.frozenLabel', {
  defaultMessage: 'Frozen',
});

const rollupLabel = i18n.translate('dataViews.rollupLabel', {
  defaultMessage: 'Rollup (deprecated)',
});

const getIndexTags = (isRollupIndex: (indexName: string) => boolean) => (indexName: string) =>
  isRollupIndex(indexName)
    ? [
        {
          key: INDEX_PATTERN_TYPE.ROLLUP,
          name: rollupLabel,
          color: 'warning',
        },
      ]
    : [];

export const getIndicesViaResolve = async ({
  http,
  pattern,
  showAllIndices,
  isRollupIndex,
}: {
  http: HttpStart;
  pattern: string;
  showAllIndices: boolean;
  isRollupIndex: (indexName: string) => boolean;
}) => {
  const encodedPattern = encodeURIComponent(pattern);
  return http
    .get<ResolveIndexResponse>(
      `/internal/index-pattern-management/resolve_index/${encodedPattern}`,
      {
        query: showAllIndices ? { expand_wildcards: 'all' } : undefined,
      }
    )
    .then((response) => {
      if (!response) {
        return [];
      } else {
        return responseToItemArray(response, getIndexTags(isRollupIndex));
      }
    });
};

export async function getIndices({
  http,
  pattern: rawPattern = '',
  showAllIndices = false,
  isRollupIndex,
}: {
  http: HttpStart;
  pattern: string;
  showAllIndices?: boolean;
  isRollupIndex: (indexName: string) => boolean;
}): Promise<MatchedItem[]> {
  const pattern = rawPattern.trim();

  // Searching for `*:` fails for CCS environments. The search request
  // is worthless anyways as the we should only send a request
  // for a specific query (where we do not append *) if there is at
  // least a single character being searched for.
  if (pattern === '*:') {
    return [];
  }

  // This should never match anything so do not bother
  if (pattern === '') {
    return [];
  }

  // ES does not like just a `,*` and will throw a `[string_index_out_of_bounds_exception] String index out of range: 0`
  if (pattern.startsWith(',')) {
    return [];
  }

  return getIndicesViaResolve({
    http,
    pattern,
    showAllIndices,
    isRollupIndex,
  }).catch(() => []);
}

export const responseToItemArray = (
  response: ResolveIndexResponse,
  getTags: (indexName: string) => Tag[]
): MatchedItem[] => {
  const source: MatchedItem[] = [];

  (response.indices || []).forEach((index) => {
    const tags: MatchedItem['tags'] = [{ key: 'index', name: indexLabel, color: 'default' }];
    const isFrozen = (index.attributes || []).includes(ResolveIndexResponseItemIndexAttrs.FROZEN);

    tags.push(...getTags(index.name));
    if (isFrozen) {
      tags.push({ name: frozenLabel, key: 'frozen', color: 'danger' });
    }

    source.push({
      name: index.name,
      tags,
      item: index,
    });
  });
  (response.aliases || []).forEach((alias) => {
    source.push({
      name: alias.name,
      tags: [{ key: 'alias', name: aliasLabel, color: 'default' }],
      item: alias,
    });
  });
  (response.data_streams || []).forEach((dataStream) => {
    source.push({
      name: dataStream.name,
      tags: [{ key: 'data_stream', name: dataStreamLabel, color: 'primary' }],
      item: dataStream,
    });
  });

  return sortBy(source, 'name');
};
