/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DocLinksStart, NotificationsStart, CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';

import {
  IndexPatternField,
  IndexPattern,
  DataPublicPluginStart,
  RuntimeType,
} from '../shared_imports';
import { Field, PluginStart, InternalFieldType } from '../types';
import { deserializeField } from '../lib';
import { Props as FieldEditorProps } from './field_editor/field_editor';
import { FieldEditorFlyoutContent } from './field_editor_flyout_content';

export interface FieldEditorContext {
  indexPattern: IndexPattern;
  /**
   * The Kibana field type of the field to create or edit
   * Default: "runtime"
   */
  fieldTypeToProcess: InternalFieldType;
}

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (field: IndexPatternField) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  /**
   * The docLinks start service from core
   */
  docLinks: DocLinksStart;
  /**
   * The context object specific to where the editor is currently being consumed
   */
  ctx: FieldEditorContext;
  /**
   * Optional field to edit
   */
  field?: IndexPatternField;
  /**
   * Services
   */
  indexPatternService: DataPublicPluginStart['indexPatterns'];
  notifications: NotificationsStart;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  uiSettings: CoreStart['uiSettings'];
}

/**
 * The container component will be in charge of the communication with the index pattern service
 * to retrieve/save the field in the saved object.
 * The <FieldEditorFlyoutContent /> component is the presentational component that won't know
 * anything about where a field comes from and where it should be persisted.
 */

export const FieldEditorFlyoutContentContainer = ({
  field,
  onSave,
  onCancel,
  docLinks,
  indexPatternService,
  ctx: { indexPattern, fieldTypeToProcess },
  notifications,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
}: Props) => {
  const fieldToEdit = deserializeField(indexPattern, field);
  const [Editor, setEditor] = useState<React.ComponentType<FieldEditorProps> | null>(null);

  const saveField = useCallback(
    async (updatedField: Field) => {
      const script = updatedField.script?.source ? updatedField.script : undefined;

      if (fieldTypeToProcess === 'runtime') {
        indexPattern.addRuntimeField(updatedField.name, {
          type: updatedField.type as RuntimeType,
          script,
        });
      }

      const editedField = indexPattern.getFieldByName(updatedField.name);

      try {
        if (!editedField) {
          throw new Error(
            `Unable to find field named '${updatedField.name}' on index pattern '${indexPattern.title}'`
          );
        }

        indexPattern.setFieldCustomLabel(updatedField.name, updatedField.customLabel);
        editedField.count = updatedField.popularity || 0;
        if (updatedField.format) {
          indexPattern.setFieldFormat(updatedField.name, updatedField.format);
        } else {
          indexPattern.deleteFieldFormat(updatedField.name);
        }

        indexPatternService.updateSavedObject(indexPattern).then(() => {
          onSave(editedField);
        });
      } catch (e) {
        const title = i18n.translate('indexPatternFieldEditor.save.errorTitle', {
          defaultMessage: 'Failed to save field changes',
        });
        notifications.toasts.addError(e, { title });
      }
    },
    [onSave, indexPattern, indexPatternService, notifications, fieldTypeToProcess]
  );

  const loadEditor = useCallback(async () => {
    const { FieldEditor } = await import('./field_editor');

    setEditor(() => FieldEditor);
  }, []);

  useEffect(() => {
    // On mount: load the editor asynchronously
    loadEditor();
  }, [loadEditor]);

  return (
    <FieldEditorFlyoutContent
      onSave={saveField}
      onCancel={onCancel}
      docLinks={docLinks}
      field={fieldToEdit}
      FieldEditor={Editor}
      fieldFormatEditors={fieldFormatEditors}
      fieldFormats={fieldFormats}
      uiSettings={uiSettings}
      indexPattern={indexPattern}
      fieldTypeToProcess={fieldTypeToProcess}
    />
  );
};
