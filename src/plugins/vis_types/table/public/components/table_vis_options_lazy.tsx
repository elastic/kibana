/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { TableVisParams } from '../../common';

const TableOptionsComponent = lazy(() => import('./table_vis_options'));

export const TableOptions = (props: VisEditorOptionsProps<TableVisParams>) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <TableOptionsComponent {...props} />
  </Suspense>
);
