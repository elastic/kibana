/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { type MonacoYamlOptions } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { yamlLanguageService } from './yaml_language_service';

export interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId' | 'onChange'> {
  onChange: (value: string) => void;
  schemas: MonacoYamlOptions['schemas'] | null;
}

export const YamlEditor = React.memo(
  ({ value, onChange, editorWillUnmount: _editorWillUnmount, ...props }: YamlEditorProps) => {
    const [internalValue, setInternalValue] = useState(value);
    const onChangeDebounced = useMemo(() => debounce(onChange, 200), [onChange]);

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

    useEffect(() => {
      // Initialize or update the YAML language service with the provided schemas
      yamlLanguageService.update(props.schemas ?? []);
    }, [props.schemas]);

    const handleEditorWillUnmount = useCallback(() => {
      // Clear schemas when unmounting to avoid conflicts with other YamlEditor instances
      // Note: We don't dispose the service entirely as other instances might still be using it
      yamlLanguageService.clearSchemas();
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
