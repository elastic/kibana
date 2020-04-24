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

import React, { useCallback } from 'react';
import { EuiFormRow, EuiCodeEditor } from '@elastic/eui';
import { debounce } from 'lodash';

import { isJSON } from '../../../static/validators/string';
import { useJson, OnJsonEditorUpdateHandler } from './use_json';

interface Props {
  onUpdate: OnJsonEditorUpdateHandler;
  label?: string;
  helpText?: React.ReactNode;
  value?: string;
  defaultValue?: { [key: string]: any };
  euiCodeEditorProps?: { [key: string]: any };
  error?: string | null;
}

export const JsonEditor = React.memo(
  ({
    label,
    helpText,
    onUpdate,
    value,
    defaultValue,
    euiCodeEditorProps,
    error: propsError,
  }: Props) => {
    const isControlled = value !== undefined;

    const { content, setContent, error: internalError } = useJson({
      defaultValue,
      onUpdate,
      isControlled,
    });

    const debouncedSetContent = useCallback(debounce(setContent, 300), [setContent]);

    // We let the consumer control the validation and the error message.
    const error = isControlled ? propsError : internalError;

    const onEuiCodeEditorChange = useCallback(
      (updated: string) => {
        if (isControlled) {
          onUpdate({
            data: {
              raw: updated,
              format() {
                return JSON.parse(updated);
              },
            },
            validate() {
              return isJSON(updated);
            },
            isValid: undefined,
          });
        } else {
          debouncedSetContent(updated);
        }
      },
      [isControlled]
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
);
