/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco, registerLanguage } from '@kbn/monaco';
import { Lang } from '.';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  registerLanguage(Lang);

  // trigger tokenizer creation by instantiating a model,
  // see https://github.com/microsoft/monaco-editor/commit/3a58c2a6ba2ffa1f3f34ed52204bc53c8b522afc
  const model = monaco.editor.createModel('', Lang.ID);
  model.dispose();
});

test(`lang (${Lang.ID})`, () => {
  expect(monaco.languages.getLanguages()).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: Lang.ID })])
  );

  expect(monaco.editor.tokenize('\\[(?:-|%{NUMBER:bytes:int})\\]', Lang.ID)).toMatchInlineSnapshot(`
    Array [
      Array [
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 0,
          "type": "string.escape.grokEscape.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 1,
          "type": "source.grokEscaped.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 2,
          "type": "regexp.grokRegex.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 5,
          "type": "source.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 6,
          "type": "regexp.grokRegex.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 7,
          "type": "string.openGrok.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 9,
          "type": "variable.syntax.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 15,
          "type": "string.separator.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 16,
          "type": "variable.id.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 21,
          "type": "string.separator.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 22,
          "type": "variable.type.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 25,
          "type": "string.closeGrok.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 26,
          "type": "regexp.grokRegex.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 27,
          "type": "string.escape.grokEscape.grok",
        },
        Token {
          "_tokenBrand": undefined,
          "language": "grok",
          "offset": 28,
          "type": "source.grokEscaped.grok",
        },
      ],
    ]
  `);
});
