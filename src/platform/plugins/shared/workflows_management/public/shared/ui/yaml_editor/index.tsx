/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { CodeEditor, CodeEditorProps } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';
import { MonacoYamlOptions } from 'monaco-yaml';

interface YamlEditorProps extends Omit<CodeEditorProps, 'languageId'> {
  schemas: MonacoYamlOptions['schemas'] | null;
}

export function YamlEditor(props: YamlEditorProps) {
  useEffect(() => {
    if (props.schemas) {
      configureMonacoYamlSchema(props.schemas);
    }
  }, [props.schemas]);

  return <CodeEditor languageId="yaml" {...props} />;
}
