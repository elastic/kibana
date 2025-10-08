/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';
import type { MonacoYamlOptions } from 'monaco-yaml';

interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId'> {
  schemas: MonacoYamlOptions['schemas'] | null;
}

export function YamlEditor(props: YamlEditorProps) {
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

  return <CodeEditor languageId="yaml" {...props} />;
}
