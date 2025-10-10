/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';
import type { MonacoYamlOptions } from 'monaco-yaml';
import { debounce } from 'lodash';

interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId' | 'onChange'> {
  onChange: (value: string | undefined) => void;
  schemas: MonacoYamlOptions['schemas'] | null;
}

export const YamlEditor = React.memo(({ value, onChange, ...props }: YamlEditorProps) => {
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
    if (props.schemas) {
      // Configure Monaco YAML with completions and hover disabled
      // while keeping validation and hover information enabled
      configureMonacoYamlSchema(props.schemas, {
        completion: false, // Disable schema-based completions
        hover: false, // hover is handled by the custom providers
        validate: true, // Keep validation
      });
    }
  }, [props.schemas]);

  return (
    <CodeEditor languageId="yaml" value={internalValue} onChange={onChangeInternal} {...props} />
  );
});
