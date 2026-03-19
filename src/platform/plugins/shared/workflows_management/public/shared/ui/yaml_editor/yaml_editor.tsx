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
  /**
   * Callback fired when the sync state changes.
   * `isSynced: true` means all debounced changes have been flushed to the onChange callback.
   * `isSynced: false` means there are pending changes waiting to be flushed.
   * This can be used to disable save buttons while changes are pending.
   */
  onSyncStateChange?: (isSynced: boolean) => void;
}

export const YamlEditor = React.memo(
  ({
    value,
    onChange,
    onSyncStateChange,
    editorWillUnmount: _editorWillUnmount,
    ...props
  }: YamlEditorProps) => {
    const [internalValue, setInternalValue] = useState(value);

    // Create a wrapped onChange that also updates sync state
    const onChangeWithSync = useCallback(
      (newValue: string) => {
        onChange(newValue);
        onSyncStateChange?.(true);
      },
      [onChange, onSyncStateChange]
    );

    const onChangeDebounced = useMemo(() => debounce(onChangeWithSync, 200), [onChangeWithSync]);

    useEffect(() => {
      // Update the internal value to the latest value from the props
      // Most of the time will be the same value, so monaco won't even update, only if some forced modification happened.
      setInternalValue(value);
    }, [value]);

    const onChangeInternal = useCallback(
      (newValue: string) => {
        // Update internal state quickly so the change is reflected instantly in the editor
        setInternalValue(newValue);
        // Notify that the changes are not synced since we have pending changes
        onSyncStateChange?.(false);
        // Debounce the call to onChange to prevent excessive re-renders upstream
        onChangeDebounced(newValue);
      },
      [onChangeDebounced, onSyncStateChange]
    );

    useEffect(() => {
      // Initialize or update the YAML language service with the provided schemas
      yamlLanguageService.update(props.schemas ?? []);
    }, [props.schemas]);

    const handleEditorWillUnmount = useCallback(() => {
      // Flush any pending changes before unmounting
      onChangeDebounced.flush();
      // Clear schemas when unmounting to avoid conflicts with other YamlEditor instances
      // Note: We don't dispose the service entirely as other instances might still be using it
      yamlLanguageService.clearSchemas();
      _editorWillUnmount?.();
    }, [_editorWillUnmount, onChangeDebounced]);

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
