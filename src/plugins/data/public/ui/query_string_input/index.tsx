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
import { withKibana } from '../../../../kibana_react/public';
import type { QueryBarTopRowProps } from './query_bar_top_row';
import type { QueryStringInputProps } from './query_string_input';

const Fallback = () => <div />;

const LazyQueryBarTopRow = React.lazy(() => import('./query_bar_top_row'));
export const QueryBarTopRow = (props: QueryBarTopRowProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryBarTopRow {...props} />
  </React.Suspense>
);

const LazyQueryStringInputUI = withKibana(React.lazy(() => import('./query_string_input')));
export const QueryStringInput = (props: QueryStringInputProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryStringInputUI {...props} />
  </React.Suspense>
);
export type { QueryStringInputProps };
