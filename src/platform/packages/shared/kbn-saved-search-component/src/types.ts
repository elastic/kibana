/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { NonPersistedDisplayOptions } from '@kbn/discover-plugin/common';
import type { CSSProperties } from 'react';

export interface SavedSearchComponentDependencies {
  embeddable: EmbeddableStart;
  searchSource: ISearchStartSearchSource;
  dataViews: DataViewsContract;
}

export interface SavedSearchComponentProps {
  dependencies: SavedSearchComponentDependencies;
  index: string;
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
  /**
   * Filters that should not trigger highlighting.
   * These filters will be included in the search query for document retrieval,
   * but excluded from the highlight_query parameter in Elasticsearch.
   */
  nonHighlightingFilters?: Filter[];
  timestampField?: string;
  columns?: string[];
  height?: CSSProperties['height'];
  displayOptions?: NonPersistedDisplayOptions;
}
