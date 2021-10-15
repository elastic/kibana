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

export const TableListView = <V extends {}>(props: TableListViewProps<V>) => {
  // Type '{}' is not assignable to type 'V'.
  // '{}' is assignable to the constraint of type 'V',
  // but 'V' could be instantiated with a different subtype of constraint '{}'.
  // @ts-expect-error
  const Lazy = <LazyTableListView {...props} />;

  return <React.Suspense fallback={null}>{Lazy}</React.Suspense>;
};
