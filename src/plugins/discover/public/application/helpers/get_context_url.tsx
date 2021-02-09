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

/**
 * Helper function to generate an URL to a document in Discover's context view
 */
export function getContextUrl(props: {
  documentId: string;
  indexPatternId: string;
  columns: string[];
  filterManager: FilterManager;
  documentTime: string;
  /* Routing is optional, but allows the context query to be more optimized
   */
  routing: string | undefined;
}) {
  const { documentId, routing, indexPatternId, columns, filterManager, documentTime } = props;
  const globalFilters = filterManager.getGlobalFilters();
  const appFilters = filterManager.getAppFilters();

  const hash = stringify(
    url.encodeQuery({
      _g: rison.encode({
        filters: globalFilters || [],
      }),
      _a: rison.encode({
        routing,
        columns,
        filters: (appFilters || []).map(esFilters.disableFilter),
        // App state for time won't affect the previously selected time filters
        documentTime,
      }),
    }),
    { encode: false, sort: false }
  );

  return `#/context/${encodeURIComponent(indexPatternId)}/${encodeURIComponent(
    documentId
  )}?${hash}`;
}
