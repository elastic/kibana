/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { monaco as monacoEditor } from '@kbn/monaco';
import { CodeEditor } from './code_editor';

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

storiesOf('CodeEditor', module)
  .addParameters({
    info: {
      // CodeEditor has no PropTypes set so this table will show up
      // as blank. I'm just disabling it to reduce confusion
      propTablesExclude: [CodeEditor],
    },
  })
  .add(
    'default',
    () => (
      <div>
        <CodeEditor
          languageId="plaintext"
          height={250}
          value="Hello!"
          onChange={action('onChange')}
        />
      </div>
    ),
    {
      info: {
        text: 'Plaintext Monaco Editor',
      },
    }
  )
  .add(
    'dark mode',
    () => (
      <div>
        <CodeEditor
          languageId="plaintext"
          height={250}
          value="Hello!"
          onChange={action('onChange')}
          useDarkTheme={true}
        />
      </div>
    ),
    {
      info: {
        text: 'The dark theme is automatically used when dark mode is enabled in Kibana',
      },
    }
  )
  .add(
    'custom log language',
    () => (
      <div>
        <CodeEditor languageId="loglang" height={250} value={logs} onChange={action('onChange')} />
      </div>
    ),
    {
      info: {
        text:
          'Custom language example. Language definition taken from [here](https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages)',
      },
    }
  )
  .add(
    'hide minimap',
    () => (
      <div>
        <CodeEditor
          languageId="loglang"
          height={250}
          value={logs}
          onChange={action('onChange')}
          options={{
            minimap: {
              enabled: false,
            },
          }}
        />
      </div>
    ),
    {
      info: {
        text: 'The minimap (on left side of editor) can be disabled to save space',
      },
    }
  )
  .add(
    'suggestion provider',
    () => {
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
              wordBasedSuggestions: false,
              quickSuggestions: true,
            }}
          />
        </div>
      );
    },
    {
      info: {
        text: 'Example suggestion provider is triggered by the `.` character',
      },
    }
  )
  .add(
    'hover provider',
    () => {
      const provideHover = (
        model: monacoEditor.editor.ITextModel,
        position: monacoEditor.Position
      ) => {
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
    },
    {
      info: {
        text: 'Hover dialog example can be triggered by hovering over a word',
      },
    }
  );
