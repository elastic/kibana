/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import type { MonacoYaml, MonacoYamlOptions } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';

// Configure Monaco YAML with completions and hover disabled
// while keeping validation and hover information enabled
const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: false, // Disable schema-based completions
  hover: false, // hover is handled by the custom providers
  validate: true, // Keep validation
};

interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId' | 'onChange'> {
  onChange: (value: string) => void;
  schemas: MonacoYamlOptions['schemas'] | null;
}

export const YamlEditor = React.memo(({ value, onChange, ...props }: YamlEditorProps) => {
  const monacoYamlRef = useRef<MonacoYaml | null>(null);
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
    async function configureMonacoYaml(schemas: MonacoYamlOptions['schemas']) {
      monacoYamlRef.current = await configureMonacoYamlSchema(schemas, defaultMonacoYamlOptions);
    }
    // configure or update the monaco yaml schema and options when the schemas change
    if (!monacoYamlRef.current) {
      configureMonacoYaml(props.schemas ?? []);
    } else {
      monacoYamlRef.current.update({
        ...defaultMonacoYamlOptions,
        schemas: props.schemas ?? [],
      });
    }
  }, [props.schemas]);

  return (
    <CodeEditor languageId="yaml" value={internalValue} onChange={onChangeInternal} {...props} />
  );
});
YamlEditor.displayName = 'YamlEditor';
