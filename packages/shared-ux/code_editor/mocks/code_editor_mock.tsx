/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { MockedMonacoEditor } from './monaco_mock';

type MockedCodeEditorProps = ComponentProps<typeof MockedMonacoEditor>;

export const MockedCodeEditor = (props: MockedCodeEditorProps) => {
  return (
    <MockedMonacoEditor
      editorDidMount={props.editorDidMount}
      editorWillMount={props.editorWillMount}
      data-currentvalue={props.value}
      value={props.value}
      {...props}
      /**
       * place this after spreading props, so the fallback value is set
       */
      data-test-subj={props['data-test-subj'] || 'mockedCodeEditor'}
    />
  );
};
