/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stringify } from 'query-string';
import rison from 'rison-node';
import { url } from '../../../../kibana_utils/common';
import { esFilters, FilterManager } from '../../../../data/public';
import { DiscoverServices } from '../../build_services';

/**
 * Helper function to generate an URL to a document in Discover's context view
 */
export function getContextUrl(
  documentId: string,
  indexPatternId: string,
  columns: string[],
  filterManager: FilterManager,
  addBasePath: DiscoverServices['addBasePath']
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

  return addBasePath(
    `/app/discover#/context/${encodeURIComponent(indexPatternId)}/${encodeURIComponent(
      documentId
    )}?${hash}`
  );
}
