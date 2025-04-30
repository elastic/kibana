/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { withKibana } from '../../../../kibana_react/public';
import type { SearchBarProps } from './search_bar';

type FallbackProps = Pick<SearchBarProps, 'displayStyle'>;

const Fallback = ({ displayStyle }: FallbackProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={{
        minHeight: `calc(${euiTheme.size.xxl} + ${euiTheme.size.s} * 2)`, // in px
        marginBottom:
          displayStyle === 'detached'
            ? euiTheme.border.width.thin // in px
            : '0px',
      }}
    />
  );
};

const LazySearchBar = React.lazy(() => import('./search_bar'));
const WrappedSearchBar = (props: SearchBarProps) => (
  <React.Suspense fallback={<Fallback displayStyle={props.displayStyle} />}>
    <LazySearchBar {...props} />
  </React.Suspense>
);

export const SearchBar = injectI18n(withKibana(WrappedSearchBar));
export type { StatefulSearchBarProps } from './create_search_bar';
export type { SearchBarProps, SearchBarOwnProps } from './search_bar';
