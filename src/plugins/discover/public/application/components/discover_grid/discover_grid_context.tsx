/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { IndexPattern } from '../../../kibana_services';

export interface GridContext {
  expanded: ElasticSearchHit | undefined;
  setExpanded: (hit: ElasticSearchHit | undefined) => void;
  rows: ElasticSearchHit[];
  onFilter: DocViewFilterFn;
  indexPattern: IndexPattern;
  isDarkMode: boolean;
}

const defaultContext = ({} as unknown) as GridContext;

export const DiscoverGridContext = React.createContext<GridContext>(defaultContext);
