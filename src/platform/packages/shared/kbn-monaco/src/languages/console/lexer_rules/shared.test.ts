/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../monaco_imports';
import { lexerRules, consoleOutputLexerRules } from '.';
import { consoleSharedLexerRules, matchTokensWithEOL } from './shared';

const CONSOLE_TEST_LANG_ID = 'console_test';
const CONSOLE_OUTPUT_TEST_LANG_ID = 'console_output_test';

const getTokenTypeAtOffset = (
  tokens: Array<{ offset: number; type: string }>,
  offset: number
): string => {
  const token = [...tokens].reverse().find(({ offset: tokenOffset }) => tokenOffset <= offset);
  if (!token) {
    throw new Error(`Expected a token at offset ${offset}`);
  }
  return token.type;
};

const getLineTokens = (
  tokenizedLines: Array<Array<{ offset: number; type: string }>>,
  text: string
) => {
  const lines = text.split('\n');
  return (lineText: string) => {
    const index = lines.indexOf(lineText);
    if (index < 0) throw new Error(`Line not found: ${JSON.stringify(lineText)}`);
    return tokenizedLines[index];
  };
};

describe('Console highlighting', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    monaco.languages.register({ id: CONSOLE_TEST_LANG_ID });
    monaco.languages.setMonarchTokensProvider(CONSOLE_TEST_LANG_ID, lexerRules);
    monaco.languages.register({ id: CONSOLE_OUTPUT_TEST_LANG_ID });
    monaco.languages.setMonarchTokensProvider(CONSOLE_OUTPUT_TEST_LANG_ID, consoleOutputLexerRules);

    // Trigger tokenizer creation.
    monaco.editor.createModel('', CONSOLE_TEST_LANG_ID).dispose();
    monaco.editor.createModel('', CONSOLE_OUTPUT_TEST_LANG_ID).dispose();
  });

  it('keeps nested braces and following JSON keys highlighted in the editor', () => {
    const text = `GET _all
{
  "body": {
    "properties": {
      "structured": {
        "type": "object",
        "subobjects": false
      },
      "text": {
        "type": "match_only_text"
      },
      "event_name": {
        "type": "keyword"
      }
    }
  }
}`;

    const tokenizedLines = monaco.editor.tokenize(text, CONSOLE_TEST_LANG_ID);

    const getLine = getLineTokens(tokenizedLines, text);

    const nestedClosingLine = getLine('      },');
    const nestedClosingTokenType = getTokenTypeAtOffset(nestedClosingLine, 6);
    expect(nestedClosingTokenType).toContain('paren.rparen');
    expect(nestedClosingTokenType).not.toContain('text');

    const eventNameLineText = '      "event_name": {';
    const eventNameLine = getLine(eventNameLineText);
    const eventNameTokenType = getTokenTypeAtOffset(eventNameLine, eventNameLineText.indexOf('"'));
    expect(eventNameTokenType).toContain('variable');
    expect(eventNameTokenType).not.toContain('text');
  });

  it('returns to root after the top-level closing brace at end-of-line in the editor', () => {
    const text = `GET _all
{
  "a": {
    "b": 1
  }
}
GET _search`;

    const tokenizedLines = monaco.editor.tokenize(text, CONSOLE_TEST_LANG_ID);
    const getLine = getLineTokens(tokenizedLines, text);

    const requestLineAfterJson = getLine('GET _search');
    const methodTokenType = getTokenTypeAtOffset(requestLineAfterJson, 0);
    expect(methodTokenType).toContain('method');
    expect(methodTokenType).not.toContain('text');
  });

  it('keeps nested braces and following JSON keys highlighted in output', () => {
    const text = `{
  "body": {
    "properties": {
      "structured": {
        "type": "object",
        "subobjects": false
      },
      "text": {
        "type": "match_only_text"
      },
      "event_name": {
        "type": "keyword"
      }
    }
  }
}`;

    const tokenizedLines = monaco.editor.tokenize(text, CONSOLE_OUTPUT_TEST_LANG_ID);

    const getLine = getLineTokens(tokenizedLines, text);

    const nestedClosingLine = getLine('      },');
    const nestedClosingTokenType = getTokenTypeAtOffset(nestedClosingLine, 6);
    expect(nestedClosingTokenType).toContain('paren.rparen');
    expect(nestedClosingTokenType).not.toContain('text');

    const eventNameLineText = '      "event_name": {';
    const eventNameLine = getLine(eventNameLineText);
    const eventNameTokenType = getTokenTypeAtOffset(eventNameLine, eventNameLineText.indexOf('"'));
    expect(eventNameTokenType).toContain('variable');
    expect(eventNameTokenType).not.toContain('text');
  });

  it('does not overflow the tokenizer stack on deeply nested braces', () => {
    const depth = 2000;
    const text = `GET _all
${'{'.repeat(depth)}${'}'.repeat(depth)}`;

    expect(() => monaco.editor.tokenize(text, CONSOLE_TEST_LANG_ID)).not.toThrow();

    const tokenizedLines = monaco.editor.tokenize(text, CONSOLE_TEST_LANG_ID);
    const bracesLine = tokenizedLines[1];
    expect(bracesLine).toBeDefined();

    const firstTokenType = getTokenTypeAtOffset(bracesLine, 0);
    const lastTokenType = getTokenTypeAtOffset(bracesLine, depth + (depth - 1));
    expect(firstTokenType).toContain('paren.lparen');
    expect(lastTokenType).toContain('paren.rparen');
  });
});

describe('Lexer rule composition', () => {
  it('matchTokensWithEOL() builds @eos/@default cases for string tokens', () => {
    const rule = matchTokensWithEOL('tok', /x/, 'eol_state', 'default_state');
    expect(rule.regex).toEqual(/x/);
    expect(rule.action).toEqual({
      cases: {
        '@eos': { token: 'tok', next: 'eol_state' },
        '@default': { token: 'tok', next: 'default_state' },
      },
    });
  });

  it('matchTokensWithEOL() builds @eos/@default cases for token arrays', () => {
    const rule = matchTokensWithEOL(['a', 'b'], /x/, 'eol_state', 'default_state');
    expect(rule.regex).toEqual(/x/);
    expect(rule.action).toEqual({
      cases: {
        '@eos': ['a', { token: 'b', next: 'eol_state' }],
        '@default': ['a', { token: 'b', next: 'default_state' }],
      },
    });
  });

  it('json_root brace rules do not use @push/@pop', () => {
    const jsonRoot = (consoleSharedLexerRules.tokenizer as any).json_root as any[];

    const braceRules = jsonRoot.filter((rule) => {
      const regex = Array.isArray(rule) ? rule[0] : rule?.regex;
      return regex instanceof RegExp && ['{', '}', '\\{', '\\}'].includes(regex.source);
    });

    const stringifiedActions = JSON.stringify(
      braceRules.map((rule) => (Array.isArray(rule) ? rule[1] : rule?.action))
    );

    expect(stringifiedActions).not.toContain('@push');
    expect(stringifiedActions).not.toContain('@pop');
  });

  it('json_root includes the Console-specific closing brace EOL rule', () => {
    const jsonRoot = (consoleSharedLexerRules.tokenizer as any).json_root as any[];

    const hasRule = jsonRoot.some((rule) => {
      const regex = Array.isArray(rule) ? rule[0] : rule?.regex;
      return regex instanceof RegExp && regex.source === '^}\\s*';
    });

    expect(hasRule).toBe(true);
  });
});
