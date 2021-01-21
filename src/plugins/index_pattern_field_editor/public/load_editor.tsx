/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CoreSetup, OverlayRef } from 'src/core/public';

import { createKibanaReactContext, toMountPoint, IndexPatternField } from './shared_imports';
import { LoadEditorResponse } from './types';
import { FieldEditorFlyoutContentProps } from './components';

export interface OpenFieldEditorProps {
  onSave(field: IndexPatternField): void;
  field?: FieldEditorFlyoutContentProps['field'];
  ctx: FieldEditorFlyoutContentProps['ctx'];
}

export const getFieldEditorLoader = (
  coreSetup: CoreSetup
) => async (): Promise<LoadEditorResponse> => {
  const { FieldEditorFlyoutContent } = await import('./components');
  const [core] = await coreSetup.getStartServices();
  const { uiSettings, overlays, docLinks } = core;
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
      onSave(updatedField);
    };

    overlayRef = overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <FieldEditorFlyoutContent
            onSave={onSaveField}
            onCancel={() => overlayRef?.close()}
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
