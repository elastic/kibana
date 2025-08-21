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

type BaseEditorProps = Omit<CodeEditorProps, 'languageId' | 'value' | 'original' | 'modified'>;

interface YamlEditorSingleProps extends BaseEditorProps {
  value: string;
}

interface YamlEditorDiffProps extends BaseEditorProps {
  original: string;
  modified: string;
}

export type YamlEditorProps = (YamlEditorSingleProps | YamlEditorDiffProps) & {
  schemas: MonacoYamlOptions['schemas'] | null;
};

export function YamlEditor(props: YamlEditorProps) {
  useEffect(() => {
    if (props.schemas) {
      configureMonacoYamlSchema(props.schemas);
    }
  }, [props.schemas]);

  const { schemas, ...rest } = props as any;
  return <CodeEditor languageId="yaml" {...(rest as Omit<CodeEditorProps, 'languageId'>)} />;
}
