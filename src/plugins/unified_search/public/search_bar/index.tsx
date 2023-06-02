/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchBarProps } from './search_bar';

const Fallback = () => <div />;

const LazySearchBar = React.lazy(() => import('./search_bar'));
const WrappedSearchBar = <QT extends AggregateQuery | Query = Query>(
  props: Omit<SearchBarProps<QT>, 'intl' | 'kibana'>
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazySearchBar {...(props as SearchBarProps<AggregateQuery>)} />
  </React.Suspense>
);

export const SearchBar = WrappedSearchBar;
export type { StatefulSearchBarProps } from './create_search_bar';
export type { SearchBarProps, SearchBarOwnProps } from './search_bar';
