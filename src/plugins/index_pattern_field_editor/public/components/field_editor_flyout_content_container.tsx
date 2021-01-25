/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';
import { DocLinksStart } from 'src/core/public';

import { IndexPatternField, IndexPattern } from '../shared_imports';
import { FieldEditorFlyoutContent } from './field_editor_flyout_content';

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
  ctx: {
    indexPattern: IndexPattern;
  };
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
export const FieldEditorFlyoutContentContainer = ({ field, onSave, onCancel, docLinks }: Props) => {
  const saveField = useCallback(async () => {
    // TODO: here we'll put the logic to save the field to the saved object

    onSave({} as any);
  }, [onSave]);

  return (
    <FieldEditorFlyoutContent
      onSave={saveField}
      onCancel={onCancel}
      docLinks={docLinks}
      field={field}
    />
  );
};
