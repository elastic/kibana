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
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { FC } from 'react';
import React, { lazy, useState } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { CellActionsProvider } from '@kbn/cell-actions';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { DataTableRecord } from '@kbn/discover-utils';
import { EditLookupIndexFlyoutDeps } from '../types';

export interface FlyoutContentProps {
  deps: EditLookupIndexFlyoutDeps;
  props: any;
}

const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  console.log(deps, '______deps______');

  const [columns, setColumns] = useState<DatatableColumn[]>([]);
  const [rows, setRows] = useState<DataTableRecord[]>([]);

  const { coreStart, ...restDeps } = deps;

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
            <h3>test</h3>
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
