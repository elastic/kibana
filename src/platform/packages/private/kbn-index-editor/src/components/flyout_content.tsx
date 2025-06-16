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
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { lazy, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
import { FlyoutFooter } from './flyout_footer';

export interface FlyoutContentProps {
  deps: FlyoutDeps;
  props: EditLookupIndexContentContext;
}

const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

interface IndexInfo {
  exists: boolean;
  canEdit: boolean;
}

// TODO add support for pagination
const docsCount = 10_000;

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  // Index
  const [indexInfo, setIndexInfo] = useState<IndexInfo>();

  const { coreStart, ...restDeps } = deps;

  const dataView = useObservable(deps.indexUpdateService.dataView$);

  const dataViewColumns = useMemo<DatatableColumn[]>(() => {
    if (!dataView) return [];

    return (
      dataView.fields
        // Exclude metadata fields. TODO check if this is the right way to do it
        // @ts-ignore
        .filter((field) => field.spec.metadata_field !== true)
        .map((field) => {
          return {
            name: field.name,
            id: field.name,
            isNull: field.isNull,
            meta: {
              type: field.type,
              params: {
                id: field.name,
                sourceParams: {
                  fieldName: field.name,
                },
              },
              aggregatable: field.aggregatable,
              searchable: field.searchable,
              esTypes: field.esTypes,
            },
          } as DatatableColumn;
        })
    );
  }, [dataView]);

  const totalHits = 10;

  const rows = useObservable(deps.indexUpdateService.rows$, []);

  if (!dataView || !dataViewColumns.length) return null;

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
