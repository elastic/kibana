/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';
import type { MonacoYaml } from 'monaco-yaml';
import { type MonacoYamlOptions } from 'monaco-yaml';

interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId'> {
  languageId?: string;
  schemas: MonacoYamlOptions['schemas'] | null;
}

// Configure Monaco YAML with completions and hover disabled
// while keeping validation and hover information enabled
const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: false, // Disable schema-based completions
  hover: false, // hover is handled by the custom providers
  validate: true, // Keep validation
};

export function YamlEditor({ languageId = 'yaml', ...props }: YamlEditorProps) {
  const monacoYamlRef = useRef<MonacoYaml | null>(null);

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

  return <CodeEditor languageId={languageId} {...props} />;
}
