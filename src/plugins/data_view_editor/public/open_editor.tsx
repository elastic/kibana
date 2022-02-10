/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataViewsPublicPluginStart } from 'src/plugins/data_views/public';

import {
  createKibanaReactContext,
  toMountPoint,
  IndexPattern,
  DataPublicPluginStart,
} from './shared_imports';

import { CloseEditor, DataViewEditorContext, DataViewEditorProps } from './types';
import { DataViewEditorLazy } from './components/data_view_editor_lazy';

interface Dependencies {
  core: CoreStart;
  searchClient: DataPublicPluginStart['search']['search'];
  dataViews: DataViewsPublicPluginStart;
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
        searchClient,
      });

    let overlayRef: OverlayRef | null = null;

    const openEditor = ({
      onSave,
      onCancel = () => {},
      defaultTypeIsRollup = false,
      requireTimestampField = false,
    }: DataViewEditorProps): CloseEditor => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveIndexPattern = (indexPattern: IndexPattern) => {
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
                defaultTypeIsRollup={defaultTypeIsRollup}
                requireTimestampField={requireTimestampField}
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
