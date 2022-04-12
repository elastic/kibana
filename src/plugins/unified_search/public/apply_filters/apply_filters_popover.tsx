/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Filter } from '../../../data/common';
import { DataView } from '../../../data_views/common';

type CancelFnType = () => void;
type SubmitFnType = (filters: Filter[]) => void;

const Fallback = () => <div />;

const LazyApplyFiltersPopoverContent = React.lazy(() => import('./apply_filter_popover_content'));

export const applyFiltersPopover = (
  filters: Filter[],
  dataViews: DataView[],
  onCancel: CancelFnType,
  onSubmit: SubmitFnType
) => {
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyApplyFiltersPopoverContent
        dataViews={dataViews}
        filters={filters}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </React.Suspense>
  );
};
