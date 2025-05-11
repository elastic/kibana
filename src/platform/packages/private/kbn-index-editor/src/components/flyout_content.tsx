/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { useCancellableSearch } from '@kbn/ml-cancellable-search';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataTableRecord } from '@kbn/discover-utils';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { lazy, useCallback, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { EditLookupIndexContentContext, EditLookupIndexFlyoutDeps } from '../types';

export interface FlyoutContentProps {
  deps: EditLookupIndexFlyoutDeps;
  props: EditLookupIndexContentContext;
}

const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

interface IndexInfo {
  exists: boolean;
  canEdit: boolean;
}

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  const isMounted = useMountedState();

  const { runRequest, cancelRequest } = useCancellableSearch(deps.data);

  const [columns, setColumns] = useState<DatatableColumn[]>([]);
  const [rows, setRows] = useState<DataTableRecord[]>([]);
  const [dataView, setDataView] = useState<DataView>();

  // Index
  const [indexInfo, setIndexInfp] = useState<IndexInfo>();

  const { coreStart, ...restDeps } = deps;

  useEffect(
    function resolveDataView() {
      deps.data.dataViews
        .create({
          title: props.indexName,
          name: props.indexName,
          // timeFieldName,
        })
        .then((dv) => {
          if (isMounted()) {
            setDataView(dv);
          }
        });
    },
    [deps.data.dataViews, isMounted, props.indexName]
  );

  const fetchRows = useCallback(async () => {
    cancelRequest();
    const { rawResponse } = await runRequest(
      {
        params: {
          index: props.indexName,
        },
      },
      { searchStrategy: ESQL_SEARCH_STRATEGY }
    );
    setRows(rawResponse.hits.hits);
  }, [cancelRequest, props.indexName, runRequest]);

  useEffect(
    function fetchIndexInfo() {
      // TODO
      // - check if the user has read/write access to the index
      // - fetch index settings, e.g. if it is open/closed, etc
      fetchRows();
    },
    [fetchRows]
  );

  if (!dataView) return null;

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
              columns={columns}
              rows={rows}
            />
          </CellActionsProvider>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={() => {}} flush="left">
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={true} />
            <EuiFlexItem grow={false}>
              {false ? (
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonEmpty onClick={() => {}} disabled={true}>
                      <FormattedMessage
                        id="indexEditor.flyout.footer.primaryButtonLabel.saving"
                        defaultMessage="Saving..."
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}
              {true ? (
                <EuiButton onClick={() => {}}>
                  <FormattedMessage
                    id="indexEditor.flyout.footer.primaryButtonLabel.save"
                    defaultMessage="Save"
                  />
                </EuiButton>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    </KibanaContextProvider>
  );
};
