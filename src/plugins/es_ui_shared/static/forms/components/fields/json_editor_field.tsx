/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';

import { JsonEditor, OnJsonEditorUpdateHandler } from '../../../../public';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook<any, string>;
  euiCodeEditorProps?: { [key: string]: any };
  [key: string]: any;
}

export const JsonEditorField = ({ field, ...rest }: Props) => {
  const { errorMessage } = getFieldValidityAndErrorMessage(field);

  const { label, helpText, value, setValue } = field;

  const onJsonUpdate: OnJsonEditorUpdateHandler = useCallback<OnJsonEditorUpdateHandler>(
    (updatedJson) => {
      setValue(updatedJson.data.raw);
    },
    [setValue]
  );

  return (
    <JsonEditor
      label={label}
      helpText={helpText}
      value={value}
      onUpdate={onJsonUpdate}
      error={errorMessage}
      {...rest}
    />
  );
};
