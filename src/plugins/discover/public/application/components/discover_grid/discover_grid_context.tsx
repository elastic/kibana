/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { IndexPattern } from 'src/plugins/data/common';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';

export interface GridContext {
  expanded: ElasticSearchHit | undefined;
  setExpanded: (hit: ElasticSearchHit | undefined) => void;
  rows: ElasticSearchHit[];
  onFilter: DocViewFilterFn;
  indexPattern: IndexPattern;
  isDarkMode: boolean;
  selectedDocs: string[];
  setSelectedDocs: (selected: string[]) => void;
}

const defaultContext = {} as unknown as GridContext;

export const DiscoverGridContext = React.createContext<GridContext>(defaultContext);
