/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutBody, EuiFlyoutHeader, EuiText } from '@elastic/eui';
import { CellActionsProvider } from '@kbn/cell-actions';
import { FileUploadContext, useFileUpload } from '@kbn/file-upload';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { Fragment, lazy } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EditLookupIndexContentContext, FlyoutDeps } from '../types';
import { CustomPanel } from './custom_panel';
import { FileDropzone } from './file_drop_zone';
import { FlyoutFooter } from './flyout_footer';
import { IndexName } from './index_name';
import { EmptyPrompt } from './empty_prompt';
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

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...restDeps,
      }}
    >
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

        <EuiFlyoutBody>
          <CustomPanel />

          <CellActionsProvider
            getTriggerCompatibleActions={deps.uiActions.getTriggerCompatibleActions}
          >
            <FileDropzone>
              {dataView && dataViewColumns ? (
                <Fragment>
                  <RowColumnCreator columns={dataViewColumns} />
                  <DataGridLazy
                    {...props}
                    dataView={dataView}
                    columns={dataViewColumns}
                    rows={rows}
                    totalHits={totalHits}
                  />
                </Fragment>
              ) : (
                <EmptyPrompt />
              )}
            </FileDropzone>
          </CellActionsProvider>
        </EuiFlyoutBody>

        <FlyoutFooter indexUpdateService={deps.indexUpdateService} onClose={props.onClose} />
      </FileUploadContext.Provider>
    </KibanaContextProvider>
  );
};
