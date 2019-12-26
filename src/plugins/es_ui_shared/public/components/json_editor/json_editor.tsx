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

import { useJson, OnUpdateHandler } from './use_json';

interface Props {
  onUpdate: OnUpdateHandler;
  label?: string;
  helpText?: React.ReactNode;
  defaultValue?: { [key: string]: any };
  euiCodeEditorProps?: { [key: string]: any };
}

export const JsonEditor = React.memo(
  ({ label, helpText, onUpdate, defaultValue, euiCodeEditorProps }: Props) => {
    const { content, setContent, error } = useJson({
      defaultValue,
      onUpdate,
    });

    const debouncedSetContent = useCallback(debounce(setContent, 300), [setContent]);

    return (
      <EuiFormRow
        label={label}
        helpText={helpText}
        isInvalid={Boolean(error)}
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
          value={content}
          onChange={(updated: string) => {
            debouncedSetContent(updated);
          }}
          {...euiCodeEditorProps}
        />
      </EuiFormRow>
    );
  }
);
