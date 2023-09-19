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
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  registerLanguage(Lang);
});

test('lang', () => {
  expect(monaco.editor.tokenize('\\[(?:-|%{NUMBER:bytes:int})\\]', 'grok')).toMatchInlineSnapshot(`
    Array [
      Array [
        Token {
          "language": "grok",
          "offset": 0,
          "type": "string.escape.grokEscape.grok",
        },
        Token {
          "language": "grok",
          "offset": 1,
          "type": "source.grokEscaped.grok",
        },
        Token {
          "language": "grok",
          "offset": 2,
          "type": "regexp.grokRegex.grok",
        },
        Token {
          "language": "grok",
          "offset": 5,
          "type": "source.grok",
        },
        Token {
          "language": "grok",
          "offset": 6,
          "type": "regexp.grokRegex.grok",
        },
        Token {
          "language": "grok",
          "offset": 7,
          "type": "string.openGrok.grok",
        },
        Token {
          "language": "grok",
          "offset": 9,
          "type": "variable.syntax.grok",
        },
        Token {
          "language": "grok",
          "offset": 15,
          "type": "string.separator.grok",
        },
        Token {
          "language": "grok",
          "offset": 16,
          "type": "variable.id.grok",
        },
        Token {
          "language": "grok",
          "offset": 21,
          "type": "string.separator.grok",
        },
        Token {
          "language": "grok",
          "offset": 22,
          "type": "variable.type.grok",
        },
        Token {
          "language": "grok",
          "offset": 25,
          "type": "string.closeGrok.grok",
        },
        Token {
          "language": "grok",
          "offset": 26,
          "type": "regexp.grokRegex.grok",
        },
        Token {
          "language": "grok",
          "offset": 27,
          "type": "string.escape.grokEscape.grok",
        },
        Token {
          "language": "grok",
          "offset": 28,
          "type": "source.grokEscaped.grok",
        },
      ],
    ]
  `);
});
