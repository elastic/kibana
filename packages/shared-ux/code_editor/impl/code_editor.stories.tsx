/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CodeEditorStorybookMock, CodeEditorStorybookParams } from '@kbn/code-editor-mocks';

import mdx from './README.mdx';

import { CodeEditor } from './code_editor';

export default {
  title: 'Code Editor',
  description: 'A code editor',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new CodeEditorStorybookMock();
const argTypes = mock.getArgumentTypes();

export const CodeEditorStorybookComponent = (params: CodeEditorStorybookParams) => {
  return <CodeEditor {...params} />;
};

CodeEditorStorybookComponent.argTypes = argTypes;
