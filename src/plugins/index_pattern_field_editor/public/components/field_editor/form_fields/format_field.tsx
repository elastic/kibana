/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React from 'react';

import { UseField } from '../../../shared_imports';
import { FormatSelectEditor, FormatSelectEditorProps } from '../../field_format_editor';

export const FormatField = ({
  fieldAttrs,
  indexPattern,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
}: Omit<FormatSelectEditorProps, 'onChange' | 'onError'>) => {
  return (
    <UseField path="format">
      {({ setValue, setErrors }) => {
        return (
          <FormatSelectEditor
            fieldAttrs={fieldAttrs}
            indexPattern={indexPattern}
            fieldFormatEditors={fieldFormatEditors}
            fieldFormats={fieldFormats}
            uiSettings={uiSettings}
            onChange={setValue}
            onError={(error) => setErrors(error ? [{ message: error }] : [])}
          />
        );
      }}
    </UseField>
  );
};
