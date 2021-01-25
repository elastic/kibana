/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';

import { createKibanaReactContext, toMountPoint, IndexPatternField } from './shared_imports';
import { LoadEditorResponse } from './types';
import { FieldEditorFlyoutContentContainerProps } from './components';

export interface OpenFieldEditorProps {
  ctx: FieldEditorFlyoutContentContainerProps['ctx'];
  onSave?: (field: IndexPatternField) => void;
  field?: FieldEditorFlyoutContentContainerProps['field'];
}

export const getFieldEditorLoader = (
  coreStart: CoreStart
) => async (): Promise<LoadEditorResponse> => {
  const { FieldEditorFlyoutContentContainer } = await import('./components');
  const { uiSettings, overlays, docLinks } = coreStart;
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });

  let overlayRef: OverlayRef | null = null;

  const openEditor = ({ onSave, field, ctx }: OpenFieldEditorProps) => {
    const closeEditor = () => {
      if (overlayRef) {
        overlayRef.close();
        overlayRef = null;
      }
    };

    const onSaveField = (updatedField: IndexPatternField) => {
      closeEditor();

      if (onSave) {
        onSave(updatedField);
      }
    };

    overlayRef = overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <FieldEditorFlyoutContentContainer
            onSave={onSaveField}
            onCancel={closeEditor}
            docLinks={docLinks}
            field={field}
            ctx={ctx}
          />
        </KibanaReactContextProvider>
      )
    );

    return closeEditor;
  };

  return {
    openEditor,
  };
};
