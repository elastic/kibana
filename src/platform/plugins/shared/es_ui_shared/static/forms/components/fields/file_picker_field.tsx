/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiFilePicker } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  maxFileSize?: number;
  [key: string]: any;
}

const ONE_MEGABYTE = 1048576;

export const FilePickerField = ({
  field,
  euiFieldProps = {},
  idAria,
  maxFileSize = ONE_MEGABYTE,
  ...rest
}: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const onChange = useCallback(
    async (files: FileList | null) => {
      if (files) {
        const filesArr = [];
        try {
          for (const file of files) {
            if (file.size > maxFileSize)
              throw new Error(
                `${file.name} is too large, maximum size is ${Math.floor(maxFileSize) / 1024}kb`
              );
            const fileBuffer = await file.arrayBuffer();
            // Base64 encode the file
            const fileData = window.btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
            filesArr.push(fileData);
          }
          if (!euiFieldProps.multiple) field.setValue(filesArr[0]);
          else field.setValue(filesArr);
        } catch (e) {
          field.setErrors([e]);
        }
      } else {
        field.setValue(null);
      }
    },
    [field, maxFileSize, euiFieldProps]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiFilePicker
        isInvalid={isInvalid}
        onChange={onChange}
        isLoading={field.isValidating}
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
