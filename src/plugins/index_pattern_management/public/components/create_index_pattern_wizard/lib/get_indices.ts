/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  indexPatternCreationType: IndexPatternCreationConfig,
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

    return responseToItemArray(response, indexPatternCreationType);
  } catch {
    return [];
  }
}

export const responseToItemArray = (
  response: ResolveIndexResponse,
  indexPatternCreationType: IndexPatternCreationConfig
): MatchedItem[] => {
  const source: MatchedItem[] = [];

  (response.indices || []).forEach((index) => {
    const tags: MatchedItem['tags'] = [{ key: 'index', name: indexLabel, color: 'default' }];
    const isFrozen = (index.attributes || []).includes(ResolveIndexResponseItemIndexAttrs.FROZEN);

    tags.push(...indexPatternCreationType.getIndexTags(index.name));
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
