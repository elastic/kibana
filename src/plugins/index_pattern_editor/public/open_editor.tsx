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

import { CloseEditor, IndexPatternEditorContext } from './types';
import { IndexPatternFlyoutContentContainer } from './components/index_pattern_flyout_content_container';

export interface OpenEditorOptions {
  onSave: (indexPattern: IndexPattern) => void;
}

interface Dependencies {
  core: CoreStart;
  indexPatternService: DataPublicPluginStart['indexPatterns'];
}

export const getEditorOpener = ({ core, indexPatternService }: Dependencies) => (
  options: OpenEditorOptions
): CloseEditor => {
  const { uiSettings, overlays, docLinks, notifications, http, application } = core;
  const {
    Provider: KibanaReactContextProvider,
  } = createKibanaReactContext<IndexPatternEditorContext>({
    uiSettings,
    docLinks,
    http,
    notifications,
    application,
    indexPatternService,
  });

  let overlayRef: OverlayRef | null = null;

  const openEditor = ({ onSave }: OpenEditorOptions): CloseEditor => {
    const closeEditor = () => {
      if (overlayRef) {
        overlayRef.close();
        overlayRef = null;
      }
    };

    const onSaveField = (indexPattern: IndexPattern) => {
      closeEditor();

      if (onSave) {
        onSave(indexPattern);
      }
    };

    overlayRef = overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <I18nProvider>
            <IndexPatternFlyoutContentContainer onSave={onSaveField} onCancel={closeEditor} />
          </I18nProvider>
        </KibanaReactContextProvider>
      ),
      {
        // hideCloseButton: true,
      }
    );

    return closeEditor;
  };

  return openEditor(options);
};
