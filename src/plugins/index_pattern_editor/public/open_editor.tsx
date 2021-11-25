/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';
import { I18nProvider } from '@kbn/i18n/react';

import {
  createKibanaReactContext,
  toMountPoint,
  IndexPattern,
  DataPublicPluginStart,
} from './shared_imports';

import { CloseEditor, IndexPatternEditorContext, IndexPatternEditorProps } from './types';
import { IndexPatternEditorLazy } from './components/index_pattern_editor_lazy';

interface Dependencies {
  core: CoreStart;
  indexPatternService: DataPublicPluginStart['indexPatterns'];
  searchClient: DataPublicPluginStart['search']['search'];
}

export const getEditorOpener =
  ({ core, indexPatternService, searchClient }: Dependencies) =>
  (options: IndexPatternEditorProps): CloseEditor => {
    const { uiSettings, overlays, docLinks, notifications, http, application } = core;
    const { Provider: KibanaReactContextProvider } =
      createKibanaReactContext<IndexPatternEditorContext>({
        uiSettings,
        docLinks,
        http,
        notifications,
        application,
        indexPatternService,
        searchClient,
      });

    let overlayRef: OverlayRef | null = null;

    const openEditor = ({
      onSave,
      onCancel = () => {},
      defaultTypeIsRollup = false,
      requireTimestampField = false,
    }: IndexPatternEditorProps): CloseEditor => {
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
              <IndexPatternEditorLazy
                onSave={onSaveIndexPattern}
                onCancel={() => {
                  closeEditor();
                  onCancel();
                }}
                defaultTypeIsRollup={defaultTypeIsRollup}
                requireTimestampField={requireTimestampField}
              />
            </I18nProvider>
          </KibanaReactContextProvider>
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
