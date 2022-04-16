/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import type { ElasticSearchHit } from '../../types';

export interface GridContext {
  expanded?: ElasticSearchHit;
  setExpanded: (hit?: ElasticSearchHit) => void;
  rows: ElasticSearchHit[];
  onFilter: DocViewFilterFn;
  indexPattern: DataView;
  isDarkMode: boolean;
  selectedDocs: string[];
  setSelectedDocs: (selected: string[]) => void;
}

const defaultContext = {} as unknown as GridContext;

export const DiscoverGridContext = React.createContext<GridContext>(defaultContext);
