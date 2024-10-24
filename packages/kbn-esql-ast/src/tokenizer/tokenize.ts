/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CharStreams, Token as ANTLRToken } from 'antlr4';
import { ESQLErrorListener, getLexer } from '../parser';

export interface Token {
  name: string;
  start: number;
}

const fakeCommandPrefix = 'FOO ';

/**
 * Given a (possibly incomplete) ESQL query, returns a list of tokens.
 * @param text the query text
 * @returns Token[]
 */
export function tokenize(_text: string): Token[] {
  let text = _text;

  let prefixOffset = 0;
  if (text.trimStart()[0] === '|') {
    // Basically just working around a lexer quirk here...
    //
    // This is a special case where the line starts with a pipe
    // the lexer doesn't handle this case correctly - it interprets
    // the pipe as an unknown command. So, we add an unknown command
    // in front of the text. Then, the pipe is interpreted correctly.
    text = fakeCommandPrefix + text;
    prefixOffset = fakeCommandPrefix.length;
  }

  const errorListener = new ESQLErrorListener();
  const inputStream = CharStreams.fromString(text);
  const lexer = getLexer(inputStream, errorListener);

  let done = false;
  const tokens: Array<{ name: string; start: number }> = [];

  do {
    let token: ANTLRToken | null;
    try {
      token = lexer.nextToken();
    } catch (e) {
      token = null;
    }

    if (token == null) {
      done = true;
    } else {
      if (token.type === ANTLRToken.EOF) {
        done = true;
      } else {
        const tokenName = lexer.symbolicNames[token.type];

        if (tokenName) {
          tokens.push({
            name: tokenName.toLowerCase(),
            start: token.start - prefixOffset,
          });
        }
      }
    }
  } while (!done);

  if (prefixOffset > 0) {
    // remove the fake command and the whitespace
    tokens.splice(0, 2);
  }

  removeLexerModes(tokens);

  // remove all tokens after any multiline comment start token
  // this is because if there is a multiline comment start token
  // (instead of a multiline comment token) it means that the comment
  // is unclosed and therefore the rest of the text is part of the comment
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].name === 'multiline_comment_start') {
      tokens.splice(i + 1);
      break;
    }
  }

  return mergeTokens(addFunctionTokens(tokens));
}

const modeNameToNormalizedName = {
  from_multiline_comment_start: 'multiline_comment_start',
  from_multiline_comment_end: 'multiline_comment_end',
  expr_multiline_comment_start: 'multiline_comment_start',
  expr_multiline_comment_end: 'multiline_comment_end',
};

function removeLexerModes(tokens: Token[]): void {
  for (const token of tokens) {
    if (modeNameToNormalizedName[token.name]) {
      token.name = modeNameToNormalizedName[token.name];
    }
  }
}

function addFunctionTokens(tokens: Token[]): Token[] {
  // need to trim spaces as "abs (arg)" is still valid as function
  const tokensWithoutSpaces = tokens.filter(({ name }) => !name.includes('_ws'));

  // find out all unquoted_identifiers index
  const unquotedIdentifierIndices = [];
  for (let i = 0; i < tokensWithoutSpaces.length; i++) {
    if (tokensWithoutSpaces[i].name === 'unquoted_identifier') {
      unquotedIdentifierIndices.push(i);
    }
  }

  // then check if the token next is an opening bracket
  for (const index of unquotedIdentifierIndices) {
    if (tokensWithoutSpaces[index + 1]?.name === 'lp') {
      // set the custom "function" token (only used in theming)
      tokensWithoutSpaces[index].name = 'function_name';
    }
  }

  return [...tokens];
}

const mergeRules = [
  [['nulls', 'expr_ws', 'first'], 'nulls_order'],
  [['nulls', 'expr_ws', 'last'], 'nulls_order'],
  [['integer', 'unquoted_identifier'], 'timespan_literal'],
  [['integer_literal', 'expr_ws', 'unquoted_identifier'], 'timespan_literal'],
] as const;

function mergeTokens(tokens: Token[]): Token[] {
  for (const [names, mergedName] of mergeRules) {
    let foundAnyMatches = false;
    do {
      foundAnyMatches = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].name === names[0]) {
          // first matched so look ahead if there's room
          if (i + names.length > tokens.length) {
            continue;
          }

          let match = true;
          for (let j = 1; j < names.length; j++) {
            if (tokens[i + j].name !== names[j]) {
              match = false;
              break;
            }
          }

          if (match) {
            foundAnyMatches = true;

            const mergedToken = {
              name: mergedName,
              start: tokens[i].start,
            };
            tokens.splice(i, names.length, mergedToken);
          }
        }
      }
    } while (foundAnyMatches);
  }

  return tokens;
}
