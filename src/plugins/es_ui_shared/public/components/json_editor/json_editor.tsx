/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiCodeEditor } from '@elastic/eui';
import { debounce } from 'lodash';

import { useJson, OnJsonEditorUpdateHandler } from './use_json';

interface Props<T extends object = { [key: string]: any }> {
  onUpdate: OnJsonEditorUpdateHandler<T>;
  label?: string;
  helpText?: React.ReactNode;
  value?: string;
  defaultValue?: T;
  euiCodeEditorProps?: { [key: string]: any };
  error?: string | null;
}

function JsonEditorComp<T extends object = { [key: string]: any }>({
  label,
  helpText,
  onUpdate,
  value,
  defaultValue,
  euiCodeEditorProps,
  error: propsError,
}: Props<T>) {
  const { content, setContent, error: internalError, isControlled } = useJson<T>({
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
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        width="100%"
        height="500px"
        setOptions={{
          showLineNumbers: false,
          tabSize: 2,
        }}
        editorProps={{
          $blockScrolling: Infinity,
        }}
        showGutter={false}
        minLines={6}
        value={isControlled ? value : content}
        onChange={onEuiCodeEditorChange}
        {...euiCodeEditorProps}
      />
    </EuiFormRow>
  );
}

export const JsonEditor = React.memo(JsonEditorComp) as typeof JsonEditorComp;
