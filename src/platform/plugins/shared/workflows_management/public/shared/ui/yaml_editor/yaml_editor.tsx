/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';

// Configure Monaco YAML with completions and hover disabled
// while keeping validation and hover information enabled
const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: true, // Enable schema-based completions from monaco-yaml until we re-implement 'with' block completions in our own provider
  hover: false, // hover is handled by the custom providers
  validate: true, // Keep validation
};

export const monacoYamlSingletonObj: { singleton: MonacoYaml | null } = { singleton: null };

export interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId' | 'onChange'> {
  onChange: (value: string) => void;
  schemas: MonacoYamlOptions['schemas'] | null;
}

export const YamlEditor = React.memo(
  ({ value, onChange, editorWillUnmount: _editorWillUnmount, ...props }: YamlEditorProps) => {
    const [internalValue, setInternalValue] = useState(value);
    const onChangeDebounced = useMemo(() => debounce(onChange, 200), [onChange]);

    useEffect(() => {
      if (!monacoYamlSingletonObj.singleton) {
        configureMonacoYamlSchema(props.schemas ?? [], defaultMonacoYamlOptions).then(
          (monacoYaml) => {
            monacoYamlSingletonObj.singleton = monacoYaml;
          }
        );
      } else {
        monacoYamlSingletonObj.singleton.update({
          ...defaultMonacoYamlOptions,
          schemas: props.schemas ?? [],
        });
      }
    }, [props.schemas]);

    useEffect(() => {
      // Update the internal value to the latest value from the props
      // Most of the time will be the same value, so monaco won't even update, only if some forced modification happened.
      setInternalValue(value);
    }, [value]);

    const onChangeInternal = useCallback(
      (newValue: string) => {
        // Update internal state quickly so the change is reflected instantly in the editor
        setInternalValue(newValue);
        // Debounce the call to onChange to prevent excessive re-renders upstream
        onChangeDebounced(newValue);
      },
      [onChangeDebounced]
    );

    const handleEditorWillUnmount = useCallback(() => {
      if (monacoYamlSingletonObj.singleton) {
        monacoYamlSingletonObj.singleton.update({
          ...defaultMonacoYamlOptions,
          schemas: [],
        });
        monacoYamlSingletonObj.singleton = null;
      }
      _editorWillUnmount?.();
    }, [_editorWillUnmount]);

    return (
      <CodeEditor
        languageId="yaml"
        value={internalValue}
        onChange={onChangeInternal}
        editorWillUnmount={handleEditorWillUnmount}
        {...props}
      />
    );
  }
);
YamlEditor.displayName = 'YamlEditor';
