/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';

import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DataPublicPluginStart } from './shared_imports';
import { createKibanaReactContext } from './shared_imports';

import type { CloseEditor, DataViewEditorContext, DataViewEditorProps } from './types';
import { DataViewEditorLazy } from './components/data_view_editor_lazy';

interface Dependencies {
  core: CoreStart;
  searchClient: DataPublicPluginStart['search']['search'];
  dataViews: DataViewsServicePublic;
}

export const getEditorOpener =
  ({ core, searchClient, dataViews }: Dependencies) =>
  (options: DataViewEditorProps): CloseEditor => {
    const { uiSettings, overlays, docLinks, notifications, http, application } = core;
    const { Provider: KibanaReactContextProvider } =
      createKibanaReactContext<DataViewEditorContext>({
        uiSettings,
        docLinks,
        http,
        notifications,
        application,
        dataViews,
        overlays,
        searchClient,
      });

    let overlayRef: OverlayRef | null = null;

    const openEditor = ({
      onSave,
      onCancel = () => {},
      defaultTypeIsRollup = false,
      requireTimestampField = false,
      allowAdHocDataView = false,
      editData,
      onDuplicate,
      isDuplicating,
      getDataViewHelpText,
    }: DataViewEditorProps): CloseEditor => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveIndexPattern = (indexPattern: DataView) => {
        closeEditor();

        if (onSave) {
          onSave(indexPattern);
        }
      };

      overlayRef = overlays.openFlyout(
        toMountPoint(
          <KibanaReactContextProvider>
            <DataViewEditorLazy
              onSave={onSaveIndexPattern}
              onCancel={() => {
                closeEditor();
                onCancel();
              }}
              editData={editData}
              defaultTypeIsRollup={defaultTypeIsRollup}
              requireTimestampField={requireTimestampField}
              allowAdHocDataView={allowAdHocDataView}
              showManagementLink={Boolean(editData && editData.isPersisted())}
              onDuplicate={onDuplicate}
              isDuplicating={isDuplicating}
              getDataViewHelpText={getDataViewHelpText}
            />
          </KibanaReactContextProvider>,
          core
        ),
        {
          hideCloseButton: true,
          size: 'l',
          'aria-labelledby': 'dataViewEditorFlyoutTitle',
        }
      );

      return closeEditor;
    };

    return openEditor(options);
  };
