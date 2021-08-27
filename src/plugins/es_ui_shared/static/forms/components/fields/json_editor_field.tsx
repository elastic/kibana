/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback } from 'react';
import { JsonEditor } from '../../../../public/components/json_editor/json_editor';
import type { OnJsonEditorUpdateHandler } from '../../../../public/components/json_editor/use_json';
import { getFieldValidityAndErrorMessage } from '../../hook_form_lib/helpers';
import type { FieldHook } from '../../hook_form_lib/types';

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
