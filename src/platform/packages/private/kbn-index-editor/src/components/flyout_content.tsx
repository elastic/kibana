/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { CellActionsProvider } from '@kbn/cell-actions';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { lazy } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
import { FlyoutFooter } from './flyout_footer';
import { RowColumnCreator } from './row_column_creator';

export interface FlyoutContentProps {
  deps: FlyoutDeps;
  props: EditLookupIndexContentContext;
}

// Does this need to be lazy loaded? flyout is already lazy loaded //HD
const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  const { coreStart, ...restDeps } = deps;

  const dataView = useObservable(deps.indexUpdateService.dataView$);

  const dataViewColumns = useObservable(deps.indexUpdateService.dataTableColumns$);

  const totalHits = 10;

  const rows = useObservable(deps.indexUpdateService.rows$, []);

  if (!dataView || !dataViewColumns) return null;

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...restDeps,
      }}
    >
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h3>{props.indexName}</h3>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <RowColumnCreator columns={dataViewColumns} />
          <CellActionsProvider
            getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}
          >
            <DataGridLazy
              data={deps.data}
              fieldFormats={deps.fieldFormats}
              core={deps.coreStart}
              share={deps.share}
              {...props}
              dataView={dataView}
              columns={dataViewColumns}
              rows={rows}
              totalHits={totalHits}
            />
          </CellActionsProvider>
        </EuiFlyoutBody>

        <FlyoutFooter indexUpdateService={deps.indexUpdateService} onClose={props.onClose} />
      </>
    </KibanaContextProvider>
  );
};
