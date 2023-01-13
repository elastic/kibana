/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CodeEditorStorybookMock, CodeEditorStorybookParams } from '@kbn/code-editor-mocks';
import { monaco as monacoEditor } from '@kbn/monaco';

import mdx from './README.mdx';

import { CodeEditor } from './code_editor';

export default {
  title: 'Code Editor/Code Editor',
  description: 'A code editor',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new CodeEditorStorybookMock();
const argTypes = mock.getArgumentTypes();

export const Basic = (params: CodeEditorStorybookParams) => {
  return <CodeEditor {...params} languageId="plainText" />;
};

Basic.argTypes = argTypes;

// A sample language definition with a few example tokens
// Taken from https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
const simpleLogLang: monacoEditor.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\[error.*/, 'constant'],
      [/\[notice.*/, 'variable'],
      [/\[info.*/, 'string'],
      [/\[[a-zA-Z 0-9:]+\]/, 'tag'],
    ],
  },
};

monacoEditor.languages.register({ id: 'loglang' });
monacoEditor.languages.setMonarchTokensProvider('loglang', simpleLogLang);

const logs = `[Sun Mar 7 20:54:27 2004] [notice] [client xx.xx.xx.xx] This is a notice!
[Sun Mar 7 20:58:27 2004] [info] [client xx.xx.xx.xx] (104)Connection reset by peer: client stopped connection before send body completed
[Sun Mar 7 21:16:17 2004] [error] [client xx.xx.xx.xx] File does not exist: /home/httpd/twiki/view/Main/WebHome
  `;

export const CustomLogLanguage = (params: CodeEditorStorybookParams) => {
  return (
    <div>
      <CodeEditor
        {...params}
        languageId="loglang"
        height={250}
        value={logs}
        options={{
          minimap: {
            enabled: false,
          },
        }}
      />
    </div>
  );
};

CustomLogLanguage.argTypes = argTypes;
