/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';
import { i18n } from '@kbn/i18n';

import {
  createKibanaReactContext,
  toMountPoint,
  IndexPatternField,
  DataPublicPluginStart,
} from './shared_imports';
import {
  FieldEditorFlyoutContentContainer,
  Props as FieldEditorFlyoutContentContainerProps,
} from './components/field_editor_flyout_content_container';

export interface OpenFieldEditorOptions {
  ctx: FieldEditorFlyoutContentContainerProps['ctx'];
  onSave?: (field: IndexPatternField) => void;
  fieldName?: string;
}

type CloseEditor = () => void;

export const getFieldEditorOpener = (
  coreStart: CoreStart,
  indexPatternService: DataPublicPluginStart['indexPatterns']
) => (options: OpenFieldEditorOptions): CloseEditor => {
  const { uiSettings, overlays, docLinks, notifications } = coreStart;
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });

  let overlayRef: OverlayRef | null = null;

  const openEditor = ({ onSave, fieldName, ctx }: OpenFieldEditorOptions): CloseEditor => {
    const closeEditor = () => {
      if (overlayRef) {
        overlayRef.close();
        overlayRef = null;
      }
    };

    const onSaveField = (updatedField: IndexPatternField) => {
      closeEditor();

      const message = i18n.translate('indexPatternFieldEditor.deleteField.savedHeader', {
        defaultMessage: "Saved '{fieldName}'",
        values: { fieldName: updatedField.name },
      });
      notifications.toasts.addSuccess(message);

      if (onSave) {
        onSave(updatedField);
      }
    };

    const field = fieldName ? ctx.indexPattern.getFieldByName(fieldName) : undefined;
    if (fieldName && !field) {
      const err = i18n.translate('indexPatternFieldEditor.noSuchFieldName', {
        defaultMessage: "Field named '{fieldName}' not found on index pattern",
        values: { fieldName },
      });
      notifications.toasts.addDanger(err);
      return closeEditor;
    }

    overlayRef = overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <FieldEditorFlyoutContentContainer
            onSave={onSaveField}
            onCancel={closeEditor}
            docLinks={docLinks}
            field={field}
            ctx={ctx}
            indexPatternService={indexPatternService}
          />
        </KibanaReactContextProvider>
      )
    );

    return closeEditor;
  };

  return openEditor(options);
};
