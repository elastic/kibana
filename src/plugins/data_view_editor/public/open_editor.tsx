/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

import { createKibanaReactContext, toMountPoint, DataPublicPluginStart } from './shared_imports';

import { CloseEditor, DataViewEditorContext, DataViewEditorProps } from './types';
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
            <I18nProvider>
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
              />
            </I18nProvider>
          </KibanaReactContextProvider>,
          { theme$: core.theme.theme$ }
        ),
        {
          hideCloseButton: true,
          size: 'l',
        }
      );

      return closeEditor;
    };

    return openEditor(options);
  };
