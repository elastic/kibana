/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CodeEditor } from './code_editor';
import { monaco } from '@kbn/monaco';
import { shallow } from 'enzyme';

// disabled because this is a test, but also it seems we shouldn't need this?
/* eslint-disable-next-line @kbn/eslint/module_migration */
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';

// A sample language definition with a few example tokens
const simpleLogLang: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\[error.*/, 'constant'],
      [/\[notice.*/, 'variable'],
      [/\[info.*/, 'string'],
      [/\[[a-zA-Z 0-9:]+\]/, 'tag'],
    ],
  },
};

monaco.languages.register({ id: 'loglang' });
monaco.languages.setMonarchTokensProvider('loglang', simpleLogLang);

const logs = `
[Sun Mar 7 20:54:27 2004] [notice] [client xx.xx.xx.xx] This is a notice!
[Sun Mar 7 20:58:27 2004] [info] [client xx.xx.xx.xx] (104)Connection reset by peer: client stopped connection before send body completed
[Sun Mar 7 21:16:17 2004] [error] [client xx.xx.xx.xx] File does not exist: /home/httpd/twiki/view/Main/WebHome
`;

test('is rendered', () => {
  const component = shallow(
    <CodeEditor languageId="loglang" height={250} value={logs} onChange={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('editor mount setup', () => {
  const suggestionProvider = {
    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => ({
      suggestions: [],
    }),
  };
  const signatureProvider = {
    provideSignatureHelp: () => ({ signatures: [], activeParameter: 0, activeSignature: 0 }),
  };
  const hoverProvider = {
    provideHover: (model: monaco.editor.ITextModel, position: monaco.Position) => ({
      contents: [],
    }),
  };

  const editorWillMount = jest.fn();

  monaco.languages.onLanguage = jest.fn((languageId, func) => {
    expect(languageId).toBe('loglang');

    // Call the function immediately so we can see our providers
    // get setup without a monaco editor setting up completely
    func();
  }) as any;

  monaco.languages.registerCompletionItemProvider = jest.fn();
  monaco.languages.registerSignatureHelpProvider = jest.fn();
  monaco.languages.registerHoverProvider = jest.fn();

  monaco.editor.defineTheme = jest.fn();

  const wrapper = shallow(
    <CodeEditor
      languageId="loglang"
      value={logs}
      onChange={() => {}}
      editorWillMount={editorWillMount}
      suggestionProvider={suggestionProvider}
      signatureProvider={signatureProvider}
      hoverProvider={hoverProvider}
    />
  );

  const instance = wrapper.instance() as CodeEditor;
  instance._editorWillMount(monaco);

  // Verify our mount callback will be called
  expect(editorWillMount.mock.calls.length).toBe(1);

  // Verify our theme will be setup
  expect((monaco.editor.defineTheme as jest.Mock).mock.calls.length).toBe(1);

  // Verify our language features have been registered
  expect((monaco.languages.onLanguage as jest.Mock).mock.calls.length).toBe(1);
  expect((monaco.languages.registerCompletionItemProvider as jest.Mock).mock.calls.length).toBe(1);
  expect((monaco.languages.registerSignatureHelpProvider as jest.Mock).mock.calls.length).toBe(1);
  expect((monaco.languages.registerHoverProvider as jest.Mock).mock.calls.length).toBe(1);
});
