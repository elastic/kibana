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
  EuiSpacer,
  EuiToolTip,
  EuiBetaBadge,
  EuiSkeletonText,
} from '@elastic/eui';
import { CellActionsProvider } from '@kbn/cell-actions';
import { FileUploadContext, useFileUpload } from '@kbn/file-upload';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { lazy } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { FileUploadResults } from '@kbn/file-upload-common';
import { i18n } from '@kbn/i18n';
import { ErrorCallout } from './error_callout';
import { isPlaceholderColumn } from '../utils';
import { UnsavedChangesModal } from './modals/unsaved_changes_modal';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
import { QueryBar } from './query_bar';
import { FileDropzone } from './file_drop_zone';
import { FlyoutFooter } from './flyout_footer';
import { IndexName } from './index_name';

export interface FlyoutContentProps {
  deps: FlyoutDeps;
  props: EditLookupIndexContentContext & { onClose: () => void };
}

const DataGridLazy = withSuspense(lazy(() => import('./data_grid')));

export const FlyoutContent: FC<FlyoutContentProps> = ({ deps, props }) => {
  const { coreStart, ...restDeps } = deps;

  const dataView = useObservable(deps.indexUpdateService.dataView$);
  const dataViewColumns = useObservable(deps.indexUpdateService.dataTableColumns$);

  const totalHits = useObservable(deps.indexUpdateService.totalHits$);

  const rows = useObservable(deps.indexUpdateService.rows$, []);
  const isLoading = useObservable(deps.indexUpdateService.isFetching$, false);

  const fileUploadContextValue = useFileUpload(
    deps.fileManager,
    deps.data,
    coreStart.application,
    coreStart.http,
    coreStart.notifications,
    // onUploadComplete
    (results: FileUploadResults | null) => {
      if (results) {
        fileUploadContextValue.setExistingIndexName(results.index);
        results.files.forEach((_, index) => {
          deps.fileManager.removeFile(index);
        });
      }
    }
  );

  const columnsWithoutPlaceholders = dataViewColumns?.filter(
    (column) => !isPlaceholderColumn(column.name)
  );

  const noResults = !isLoading && columnsWithoutPlaceholders?.length === 0;

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...restDeps,
      }}
    >
      <CellActionsProvider getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}>
        <FileUploadContext.Provider value={fileUploadContextValue}>
          <EuiFlyoutHeader hasBorder>
            <IndexName />
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="indexEditor.flyout.headerDescription"
                    defaultMessage={
                      'You can create lookup indices manually, by uploading data from a file, or by using the Elasticsearch API.'
                    }
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  title={i18n.translate('indexEditor.flyout.experimentalLabel.title', {
                    defaultMessage: 'Technical preview',
                  })}
                  content={i18n.translate('indexEditor.flyout.experimentalLabel.content', {
                    defaultMessage: 'The lookup index editor is currently in technical preview.',
                  })}
                >
                  <EuiBetaBadge
                    tabIndex={0}
                    label=""
                    iconType="beaker"
                    size="s"
                    css={css`
                      vertical-align: middle;
                    `}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <ErrorCallout />

          <EuiFlyoutBody
            css={css`
              .euiFlyoutBody__overflowContent {
                height: 100%;
              }
            `}
          >
            <FileDropzone noResults={noResults}>
              {dataView ? (
                <EuiFlexGroup direction="column" gutterSize="s" css={{ height: '100%' }}>
                  <EuiFlexItem grow={false}>
                    <QueryBar onOpenIndexInDiscover={props.onOpenIndexInDiscover} />
                  </EuiFlexItem>

                  <EuiFlexItem grow={true} css={{ minHeight: 0 }}>
                    {dataViewColumns ? (
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
              ) : (
                <EuiSkeletonText />
              )}
            </FileDropzone>
          </EuiFlyoutBody>

          <FlyoutFooter onClose={props.onClose} />
        </FileUploadContext.Provider>
      </CellActionsProvider>
      <UnsavedChangesModal onClose={props.onClose} />
    </KibanaContextProvider>
  );
};
