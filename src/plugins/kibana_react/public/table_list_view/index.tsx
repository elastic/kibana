/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export type { TableListViewProps } from './table_list_view';
import type { TableListViewProps } from './table_list_view';

const LazyTableListView = React.lazy(() => import('./table_list_view'));

export const TableListView: React.FunctionComponent<TableListViewProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <LazyTableListView {...props} />
    </React.Suspense>
  );
};
