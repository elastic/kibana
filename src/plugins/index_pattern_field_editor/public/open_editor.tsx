/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';

import {
  createKibanaReactContext,
  toMountPoint,
  IndexPatternField,
  IndexPattern,
} from './shared_imports';
import { InternalFieldType } from './types';
import {
  FieldEditorFlyoutContentContainer,
  Props as FieldEditorFlyoutContentContainerProps,
} from './components/field_editor_flyout_content_container';

export interface OpenFieldEditorOptions {
  ctx: {
    indexPattern: IndexPattern;
  };
  onSave?: (field: IndexPatternField) => void;
  field?: FieldEditorFlyoutContentContainerProps['field'];
}

type CloseEditor = () => void;

export const getFieldEditorOpener = (coreStart: CoreStart) => (
  options: OpenFieldEditorOptions
): CloseEditor => {
  const { uiSettings, overlays, docLinks } = coreStart;
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });

  let overlayRef: OverlayRef | null = null;

  const openEditor = ({ onSave, field, ctx }: OpenFieldEditorOptions): CloseEditor => {
    // TODO (Matt): here will come the logic to define the internal field type (concrete|runtime)
    const fieldTypeToProcess: InternalFieldType = 'runtime';

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
            ctx={{ ...ctx, fieldTypeToProcess }}
          />
        </KibanaReactContextProvider>
      )
    );

    return closeEditor;
  };

  return openEditor(options);
};
