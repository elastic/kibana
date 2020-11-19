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

import React from 'react';
import { injectI18n } from '@kbn/i18n/react';
import { withKibana } from '../../../../kibana_react/public';
import type { SearchBarProps } from './search_bar';

const Fallback = () => <div />;

const LazySearchBar = React.lazy(() => import('./search_bar'));
const WrappedSearchBar = (props: SearchBarProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazySearchBar {...props} />
  </React.Suspense>
);

export const SearchBar = injectI18n(withKibana(WrappedSearchBar));
export { StatefulSearchBarProps } from './create_search_bar';
export type { SearchBarProps, SearchBarOwnProps } from './search_bar';
