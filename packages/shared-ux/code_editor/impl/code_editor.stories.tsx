/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { action } from '@storybook/addon-actions';
import { monaco as monacoEditor } from '@kbn/monaco';

import { CodeEditorStorybookMock, CodeEditorStorybookParams } from './mocks/storybook';

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
  return (
    <CodeEditor
      {...params}
      languageId="plainText"
      onChange={action('on change')}
      value="Hello!"
      height={200}
    />
  );
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

export const JSONSupport = () => {
  return (
    <div>
      <CodeEditor
        languageId="json"
        editorDidMount={(editor) => {
          monacoEditor.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: [
              {
                uri: editor.getModel()?.uri.toString() ?? '',
                fileMatch: ['*'],
                schema: {
                  type: 'object',
                  properties: {
                    version: {
                      enum: ['v1', 'v2'],
                    },
                  },
                },
              },
            ],
          });
        }}
        height={250}
        value="{}"
        onChange={action('onChange')}
      />
    </div>
  );
};

export const SuggestionProvider = () => {
  const provideSuggestions = (
    model: monacoEditor.editor.ITextModel,
    position: monacoEditor.Position,
    context: monacoEditor.languages.CompletionContext
  ) => {
    const wordRange = new monacoEditor.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );

    return {
      suggestions: [
        {
          label: 'Hello, World',
          kind: monacoEditor.languages.CompletionItemKind.Variable,
          documentation: {
            value: '*Markdown* can be used in autocomplete help',
            isTrusted: true,
          },
          insertText: 'Hello, World',
          range: wordRange,
        },
        {
          label: 'You know, for search',
          kind: monacoEditor.languages.CompletionItemKind.Variable,
          documentation: { value: 'Thanks `Monaco`', isTrusted: true },
          insertText: 'You know, for search',
          range: wordRange,
        },
      ],
    };
  };

  return (
    <div>
      <CodeEditor
        languageId="loglang"
        height={250}
        value={logs}
        onChange={action('onChange')}
        suggestionProvider={{
          triggerCharacters: ['.'],
          provideCompletionItems: provideSuggestions,
        }}
        options={{
          quickSuggestions: true,
        }}
      />
    </div>
  );
};

export const HoverProvider = () => {
  const provideHover = (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
    const word = model.getWordAtPosition(position);

    if (!word) {
      return {
        contents: [],
      };
    }

    return {
      contents: [
        {
          value: `You're hovering over **${word.word}**`,
        },
      ],
    };
  };

  return (
    <div>
      <CodeEditor
        languageId="loglang"
        height={250}
        value={logs}
        onChange={action('onChange')}
        hoverProvider={{
          provideHover,
        }}
      />
    </div>
  );
};

export const AutomaticResize = (params: CodeEditorStorybookParams) => {
  return (
    <div style={{ height: `calc(100vh - 30px)` }}>
      <CodeEditor
        {...params}
        languageId="plainText"
        onChange={action('on change')}
        value="Hello!"
        height={'100%'}
        options={{ automaticLayout: true }}
      />
    </div>
  );
};

AutomaticResize.argTypes = argTypes;

export const FitToContent = (params: CodeEditorStorybookParams) => {
  const [value, setValue] = useState('hello');
  return (
    <CodeEditor
      {...params}
      languageId="plainText"
      onChange={(newValue) => {
        setValue(newValue);
        action('on change');
      }}
      value={value}
      fitToContent={{ minLines: 3, maxLines: 5 }}
      options={{ automaticLayout: true }}
    />
  );
};

FitToContent.argTypes = argTypes;
