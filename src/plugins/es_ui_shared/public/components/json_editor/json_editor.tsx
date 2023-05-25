/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { debounce } from 'lodash';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { useJson, OnJsonEditorUpdateHandler } from './use_json';

interface Props<T extends object = { [key: string]: any }> {
  onUpdate: OnJsonEditorUpdateHandler<T>;
  label?: string;
  helpText?: React.ReactNode;
  value?: string;
  defaultValue?: T;
  codeEditorProps?: { [key: string]: any };
  error?: string | null;
}

function JsonEditorComp<T extends object = { [key: string]: any }>({
  label,
  helpText,
  onUpdate,
  value,
  defaultValue,
  codeEditorProps,
  error: propsError,
}: Props<T>) {
  const {
    content,
    setContent,
    error: internalError,
    isControlled,
  } = useJson<T>({
    defaultValue,
    onUpdate,
    value,
  });

  const debouncedSetContent = useMemo(() => {
    return debounce(setContent, 300);
  }, [setContent]);

  // We let the consumer control the validation and the error message.
  const error = isControlled ? propsError : internalError;

  const onEuiCodeEditorChange = useCallback(
    (updated: string) => {
      if (isControlled) {
        onUpdate({
          data: {
            raw: updated,
            format: () => JSON.parse(updated),
          },
          validate: () => {
            try {
              JSON.parse(updated);
              return true;
            } catch (e) {
              return false;
            }
          },
          isValid: undefined,
        });
      } else {
        debouncedSetContent(updated);
      }
    },
    [isControlled, debouncedSetContent, onUpdate]
  );

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={typeof error === 'string'}
      error={error}
      fullWidth
    >
      <CodeEditor
        languageId="json"
        height={500}
        options={{
          lineNumbers: 'off',
          tabSize: 2,
          automaticLayout: true,
        }}
        value={isControlled ? value! : content}
        onChange={onEuiCodeEditorChange}
        {...codeEditorProps}
      />
    </EuiFormRow>
  );
}

export const JsonEditor = React.memo(JsonEditorComp) as typeof JsonEditorComp;
