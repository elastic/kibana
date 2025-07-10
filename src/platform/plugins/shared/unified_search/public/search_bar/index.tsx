/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchBarProps } from './search_bar';

type FallbackProps = Pick<SearchBarProps<AggregateQuery>, 'displayStyle'>;

const Fallback = ({ displayStyle }: FallbackProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={{
        minHeight: `calc(${euiTheme.size.xxl} + ${euiTheme.size.s} * 2)`, // in px
        marginBottom:
          displayStyle && ['detached', 'withBorders'].includes(displayStyle)
            ? euiTheme.border.width.thin // in px
            : '0px',
      }}
    />
  );
};

const LazySearchBar = React.lazy(async () => {
  const { SearchBar } = await import('../ui_module');
  return { default: SearchBar };
});
const WrappedSearchBar = <QT extends AggregateQuery | Query = Query>(
  props: Omit<SearchBarProps<QT>, 'intl' | 'kibana'>
) => {
  const typeCastedProps = props as SearchBarProps<AggregateQuery>;
  const { displayStyle } = typeCastedProps;
  return (
    <React.Suspense fallback={<Fallback {...{ displayStyle }} />}>
      <LazySearchBar {...typeCastedProps} />
    </React.Suspense>
  );
};

export const SearchBar = WrappedSearchBar;
export type { StatefulSearchBarProps } from './create_search_bar';
export type { SearchBarProps, SearchBarOwnProps } from './search_bar';
