/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
} from '@elastic/eui';
import { CellActionsProvider } from '@kbn/cell-actions';
import { FileUploadContext, useFileUpload } from '@kbn/file-upload';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { lazy } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
import { CustomPanel } from './custom_panel';
import { FileDropzone } from './file_drop_zone';
import { FlyoutFooter } from './flyout_footer';
import { IndexName } from './index_name';
import { RowColumnCreator } from './row_column_creator';

export interface FlyoutContentProps {
  deps: FlyoutDeps;
  props: EditLookupIndexContentContext & { onClose: () => void };
}

const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  const { coreStart, ...restDeps } = deps;

  const dataView = useObservable(deps.indexUpdateService.dataView$);
  const dataViewColumns = useObservable(deps.indexUpdateService.dataTableColumns$);

  const totalHits = 10;

  const rows = useObservable(deps.indexUpdateService.rows$, []);
  const isLoading = useObservable(deps.indexUpdateService.isFetching$, true);
  const showClosingWarningModal = useObservable(
    deps.indexUpdateService.exitAttemptWithUnsavedFields$,
    false
  );

  const fileUploadContextValue = useFileUpload(
    deps.fileManager,
    deps.data,
    coreStart.application,
    coreStart.http,
    coreStart.notifications,
    // On upload complete callback
    (res) => {
      deps.indexUpdateService.setIndexName(res!.index);
      deps.indexUpdateService.setIndexCreated(true);
    }
  );

  const noResults = !isLoading && rows.length === 0;

  const closeWithoutSaving = () => {
    deps.indexUpdateService.deleteUnsavedFields();
    props.onClose();
  };

  const continueEditing = () => {
    deps.indexUpdateService.setExitAttemptWithUnsavedFields(false);
  };

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...restDeps,
      }}
    >
      <CellActionsProvider getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}>
        {dataView && dataViewColumns ? (
          <FileUploadContext.Provider value={fileUploadContextValue}>
            <EuiFlyoutHeader hasBorder>
              <IndexName />

              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="indexEditor.flyout.headerDescription"
                  defaultMessage={
                    'Lookup indices can be created manually, by uploading data from a file or through the Elasticsearch API.'
                  }
                />
              </EuiText>
            </EuiFlyoutHeader>

            <EuiFlyoutBody css={{ height: '100%' }}>
              <FileDropzone noResults={noResults}>
                <EuiFlexGroup direction="column" gutterSize="s" css={{ height: '100%' }}>
                  <EuiFlexItem grow={false}>
                    <CustomPanel />
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <RowColumnCreator columns={dataViewColumns} />
                  </EuiFlexItem>

                  <EuiFlexItem grow={true}>
                    {dataView && dataViewColumns && !noResults ? (
                      <DataGridLazy
                        {...props}
                        dataView={dataView}
                        columns={dataViewColumns}
                        rows={rows}
                        totalHits={totalHits}
                      />
                    ) : null}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FileDropzone>
            </EuiFlyoutBody>

            <FlyoutFooter indexUpdateService={deps.indexUpdateService} onClose={props.onClose} />
          </FileUploadContext.Provider>
        ) : null}
      </CellActionsProvider>
      {showClosingWarningModal && (
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="indexEditor.warningModal.title"
              defaultMessage="Unsaved changes"
            />
          }
          onCancel={continueEditing}
          onConfirm={closeWithoutSaving}
          cancelButtonText={
            <FormattedMessage id="indexEditor.warningModal.cancel" defaultMessage="Cancel" />
          }
          confirmButtonText={
            <FormattedMessage id="indexEditor.warningModal.confirm" defaultMessage="OK" />
          }
        >
          <FormattedMessage
            id="indexEditor.warningModal.body"
            defaultMessage="You have unsaved columns. You need at least one value set on each new column for it to be saved. Are you sure you want to leave?"
          />
        </EuiConfirmModal>
      )}
    </KibanaContextProvider>
  );
};
