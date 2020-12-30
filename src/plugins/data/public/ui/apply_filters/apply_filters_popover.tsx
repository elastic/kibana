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
import { IIndexPattern, Filter } from '../..';

type CancelFnType = () => void;
type SubmitFnType = (filters: Filter[]) => void;

const Fallback = () => <div />;

const LazyApplyFiltersPopoverContent = React.lazy(() => import('./apply_filter_popover_content'));

export const applyFiltersPopover = (
  filters: Filter[],
  indexPatterns: IIndexPattern[],
  onCancel: CancelFnType,
  onSubmit: SubmitFnType
) => {
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyApplyFiltersPopoverContent
        indexPatterns={indexPatterns}
        filters={filters}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </React.Suspense>
  );
};
