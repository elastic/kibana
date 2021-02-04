/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DocLinksStart } from 'src/core/public';

import { IndexPatternField, IndexPattern } from '../shared_imports';
import { Field, InternalFieldType } from '../types';
import { deserializeField, serializeField } from '../lib';
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
  ctx: { indexPattern, fieldTypeToProcess },
}: Props) => {
  const fieldToEdit = deserializeField(field);
  const [Editor, setEditor] = useState<React.ComponentType<FieldEditorProps> | null>(null);

  const saveField = useCallback(
    async (updatedField: Field) => {
      const indexPatternField = serializeField(updatedField);
      // TODO: here we will put the logic to update the Kibana saved object
      onSave(indexPatternField);
    },
    [onSave]
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
      fieldTypeToProcess={fieldTypeToProcess}
    />
  );
};
