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
import { stringify } from 'query-string';
import rison from 'rison-node';
import { url } from '../../../../kibana_utils/common';
import { esFilters, FilterManager } from '../../../../data/public';

/**
 * Helper function to generate an URL to a document in Discover's context view
 */
export function getContextUrl(
  documentId: string,
  indexPatternId: string,
  columns: string[],
  filterManager: FilterManager
) {
  const globalFilters = filterManager.getGlobalFilters();
  const appFilters = filterManager.getAppFilters();

  const hash = stringify(
    url.encodeQuery({
      _g: rison.encode({
        filters: globalFilters || [],
      }),
      _a: rison.encode({
        columns,
        filters: (appFilters || []).map(esFilters.disableFilter),
      }),
    }),
    { encode: false, sort: false }
  );

  return `#/context/${encodeURIComponent(indexPatternId)}/${encodeURIComponent(
    documentId
  )}?${hash}`;
}
