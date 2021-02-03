/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { sortBy } from 'lodash';
import { HttpStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { IndexPatternCreationConfig } from '../../../../../index_pattern_management/public';
import { MatchedItem, ResolveIndexResponse, ResolveIndexResponseItemIndexAttrs } from '../types';

const aliasLabel = i18n.translate('indexPatternManagement.aliasLabel', { defaultMessage: 'Alias' });
const dataStreamLabel = i18n.translate('indexPatternManagement.dataStreamLabel', {
  defaultMessage: 'Data stream',
});

const indexLabel = i18n.translate('indexPatternManagement.indexLabel', {
  defaultMessage: 'Index',
});

const frozenLabel = i18n.translate('indexPatternManagement.frozenLabel', {
  defaultMessage: 'Frozen',
});

export async function getIndices(
  http: HttpStart,
  getIndexTags: IndexPatternCreationConfig['getIndexTags'],
  rawPattern: string,
  showAllIndices: boolean
): Promise<MatchedItem[]> {
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

  const query = showAllIndices ? { expand_wildcards: 'all' } : undefined;

  try {
    const response = await http.get<ResolveIndexResponse>(
      `/internal/index-pattern-management/resolve_index/${pattern}`,
      { query }
    );
    if (!response) {
      return [];
    }

    return responseToItemArray(response, getIndexTags);
  } catch {
    return [];
  }
}

export const responseToItemArray = (
  response: ResolveIndexResponse,
  getIndexTags: IndexPatternCreationConfig['getIndexTags']
): MatchedItem[] => {
  const source: MatchedItem[] = [];

  (response.indices || []).forEach((index) => {
    const tags: MatchedItem['tags'] = [{ key: 'index', name: indexLabel, color: 'default' }];
    const isFrozen = (index.attributes || []).includes(ResolveIndexResponseItemIndexAttrs.FROZEN);

    tags.push(...getIndexTags(index.name));
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
