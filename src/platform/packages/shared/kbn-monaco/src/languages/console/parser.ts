/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConsoleParser,
  ConsoleParserResult,
  ConsoleParserReviver,
  ErrorAnnotation,
  ParsedRequest,
} from './types';
import { isRecordLike } from './utils/record_utils';
import { getErrorMessage } from './utils/error_utils';

export const createParser = (): ConsoleParser => {
  let at = 0; // The index of the current character
  let ch = ''; // The current character
  const escapee: Record<string, string> = {
    '"': '"',
    '\\': '\\',
    '/': '/',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
  };
  let text = '';
  let errors: ErrorAnnotation[] = [];
  const addError = function (errorText: string) {
    errors.push({ text: errorText, offset: at });
  };
  let requests: ParsedRequest[] = [];
  let requestStartOffset: number | undefined;
  let requestEndOffset: number | undefined;
  const getLastRequest = function () {
    const last = requests.length > 0 ? requests.pop() : undefined;
    if (last) {
      return last;
    }
    return { startOffset: requestStartOffset ?? 0 };
  };
  const addRequestStart = function () {
    requestStartOffset = at - 1;
    requests.push({ startOffset: requestStartOffset });
  };
  const updateRequestEnd = function () {
    requestEndOffset = at - 1;
  };
  const addRequestEnd = function () {
    const lastRequest = getLastRequest();
    lastRequest.endOffset = requestEndOffset;
    requests.push(lastRequest);
  };
  const error = function (m: string): never {
    throw Object.assign(new SyntaxError(m), { at, text });
  };
  const reset = function (newAt: number) {
    ch = text.charAt(newAt);
    updateRequestEnd();
    addRequestEnd();
    at = newAt + 1;
  };
  const next = function (c?: string) {
    if (c && c !== ch) {
      error("Expected '" + c + "' instead of '" + ch + "'");
    }

    ch = text.charAt(at);
    at += 1;
    return ch;
  };
  const nextOneOf = function (chars: string[]) {
    if (chars && !chars.includes(ch)) {
      error('Expected one of ' + chars + " instead of '" + ch + "'");
    }
    ch = text.charAt(at);
    at += 1;
    return ch;
  };
  const nextUpTo = function (upTo: string, errorMessage?: string) {
    const currentAt = at;
    const i = text.indexOf(upTo, currentAt);
    if (i < 0) {
      error(errorMessage || "Expected '" + upTo + "'");
    }
    reset(i + upTo.length);
    return text.substring(currentAt, i);
  };
  const peek = function (offset: number) {
    return text.charAt(at + offset);
  };
  const number = function () {
    let numString = '';

    if (ch === '-') {
      numString = '-';
      next('-');
    }
    while (ch >= '0' && ch <= '9') {
      numString += ch;
      next();
    }
    if (ch === '.') {
      numString += '.';
      while (next() && ch >= '0' && ch <= '9') {
        numString += ch;
      }
    }
    if (ch === 'e' || ch === 'E') {
      numString += ch;
      ch = next();
      if (ch === '-' || ch === '+') {
        numString += ch;
        ch = next();
      }
      while (ch >= '0' && ch <= '9') {
        numString += ch;
        ch = next();
      }
    }
    const num = +numString;
    if (isNaN(num)) {
      error('Bad number');
    }
    return num;
  };
  const string = function () {
    let hex;
    let i;
    let result = '';
    let uffff;

    if (ch === '"') {
      // If the current and the next characters are equal to "", empty string or start of triple quoted strings
      if (peek(0) === '"' && peek(1) === '"') {
        // literal
        next('"');
        next('"');
        return nextUpTo('"""', 'failed to find closing \'"""\'');
      } else {
        while (next()) {
          if (ch === '"') {
            next();
            return result;
          } else if (ch === '\\') {
            next();
            if (ch === 'u') {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              result += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === 'string') {
              result += escapee[ch];
            } else {
              break;
            }
          } else {
            result += ch;
          }
        }
      }
    }
    return error('Bad string');
  };
  const white = function () {
    while (ch) {
      // Skip whitespace.
      while (ch && ch <= ' ') {
        ch = next();
      }
      // if the current char in iteration is '#' or the char and the next char is equal to '//'
      // we are on the single line comment
      if (ch === '#' || (ch === '/' && peek(0) === '/')) {
        // Until we are on the new line, skip to the next char
        while (ch && ch !== '\n') {
          ch = next();
        }
      } else if (ch === '/' && peek(0) === '*') {
        // If the chars starts with '/*', we are on the multiline comment
        ch = next();
        ch = next();
        while (ch && !(ch === '*' && peek(0) === '/')) {
          // Until we have closing tags '*/', skip to the next char
          ch = next();
        }
        if (ch) {
          ch = next();
          ch = next();
        }
      } else break;
    }
  };
  const strictWhite = function () {
    while (ch && (ch === ' ' || ch === '\t')) {
      ch = next();
    }
  };
  const newLine = function () {
    if (ch === '\n') ch = next();
  };
  const word = function () {
    switch (ch) {
      case 't':
        next('t');
        next('r');
        next('u');
        next('e');
        return true;
      case 'f':
        next('f');
        next('a');
        next('l');
        next('s');
        next('e');
        return false;
      case 'n':
        next('n');
        next('u');
        next('l');
        next('l');
        return null;
    }
    return error("Unexpected '" + ch + "'");
  };
  // parses and returns the method
  const method = function () {
    const upperCaseChar = ch.toUpperCase();
    switch (upperCaseChar) {
      case 'G':
        nextOneOf(['G', 'g']);
        nextOneOf(['E', 'e']);
        nextOneOf(['T', 't']);
        return 'GET';
      case 'H':
        nextOneOf(['H', 'h']);
        nextOneOf(['E', 'e']);
        nextOneOf(['A', 'a']);
        nextOneOf(['D', 'd']);
        return 'HEAD';
      case 'D':
        nextOneOf(['D', 'd']);
        nextOneOf(['E', 'e']);
        nextOneOf(['L', 'l']);
        nextOneOf(['E', 'e']);
        nextOneOf(['T', 't']);
        nextOneOf(['E', 'e']);
        return 'DELETE';
      case 'P':
        nextOneOf(['P', 'p']);
        const nextUpperCaseChar = ch.toUpperCase();
        switch (nextUpperCaseChar) {
          case 'A':
            nextOneOf(['A', 'a']);
            nextOneOf(['T', 't']);
            nextOneOf(['C', 'c']);
            nextOneOf(['H', 'h']);
            return 'PATCH';
          case 'U':
            nextOneOf(['U', 'u']);
            nextOneOf(['T', 't']);
            return 'PUT';
          case 'O':
            nextOneOf(['O', 'o']);
            nextOneOf(['S', 's']);
            nextOneOf(['T', 't']);
            return 'POST';
          default:
            error("Unexpected '" + ch + "'");
        }
        break;
      default:
        error('Expected one of GET/POST/PUT/DELETE/HEAD/PATCH');
    }
  };
  function array(): unknown[] {
    const arr: unknown[] = [];

    if (ch === '[') {
      ch = next('[');
      white();
      if (ch === ']') {
        ch = next(']');
        return arr; // empty array
      }
      while (ch) {
        arr.push(value());
        white();
        if (ch === ']') {
          ch = next(']');
          return arr;
        }
        ch = next(',');
        white();
      }
    }
    return error('Bad array');
  }
  function object(): Record<string, unknown> {
    let key: string;
    const obj: Record<string, unknown> = {};

    if (ch === '{') {
      ch = next('{');
      white();
      if (ch === '}') {
        ch = next('}');
        return obj; // empty object
      }
      while (ch) {
        key = string();
        white();
        ch = next(':');
        if (Object.hasOwnProperty.call(obj, key)) {
          error('Duplicate key "' + key + '"');
        }
        obj[key] = value();
        white();
        if (ch === '}') {
          ch = next('}');
          return obj;
        }
        ch = next(',');
        white();
      }
    }
    return error('Bad object');
  }

  function value(): unknown {
    white();
    switch (ch) {
      case '{':
        return object();
      case '[':
        return array();
      case '"':
        return string();
      case '-':
        return number();
      default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
  }

  const url = function () {
    let parsedUrl = '';
    while (ch && ch !== '\n') {
      parsedUrl += ch;
      next();
    }
    if (parsedUrl === '') {
      error('Missing url');
    }
    return parsedUrl;
  };
  const request = function () {
    white();
    addRequestStart();
    method();
    updateRequestEnd();
    strictWhite();
    url();
    updateRequestEnd();
    strictWhite(); // advance to one new line
    newLine();
    strictWhite();
    if (ch === '{') {
      object();
      updateRequestEnd();
    }
    // multi doc request
    strictWhite(); // advance to one new line
    newLine();
    strictWhite();
    while (ch === '{') {
      // another object
      object();
      updateRequestEnd();
      strictWhite();
      newLine();
      strictWhite();
    }
    addRequestEnd();
  };
  const comment = function () {
    while (ch === '#') {
      while (ch && ch !== '\n') {
        ch = next();
      }
      white();
    }
  };
  const multiRequest = function () {
    while (ch && ch !== '') {
      white();
      if (!ch) {
        continue;
      }
      try {
        comment();
        white();
        if (!ch) {
          continue;
        }
        request();
        white();
      } catch (e: unknown) {
        addError(getErrorMessage(e));
        // snap
        const remainingText = text.substr(at);
        const nextMethodIndex = remainingText.search(/^\s*(POST|HEAD|GET|PUT|DELETE|PATCH)\b/im);
        const nextCommentLine = remainingText.search(/^\s*(#|\/\*|\/\/).*$/m);
        if (nextMethodIndex === -1 && nextCommentLine === -1) {
          // If there are no comments or other requests after the error, there is no point in parsing more so we stop here
          return;
        }
        // Reset parser at the next request or the next comment, whichever comes first
        at += Math.min(...[nextMethodIndex, nextCommentLine].filter((i) => i !== -1));
        reset(at);
      }
    }
  };

  function parse(source: string): ConsoleParserResult;
  function parse(source: string, reviver: ConsoleParserReviver): unknown;
  function parse(source: string, reviver?: ConsoleParserReviver): unknown {
    text = source;
    at = 0;
    errors = [];
    requests = [];
    next();
    multiRequest();
    white();
    if (ch) {
      addError('Syntax error');
    }

    const result = { errors, requests };

    if (typeof reviver !== 'function') {
      return result;
    }

    const holder: Record<string, unknown> = { '': result };

    return (function walk(walkHolder: Record<string, unknown>, key: string) {
      let k: string;
      let v: unknown;
      const currentValue = walkHolder[key];
      if (isRecordLike(currentValue)) {
        for (k in currentValue) {
          if (Object.hasOwnProperty.call(currentValue, k)) {
            v = walk(currentValue, k);
            if (v !== undefined) {
              currentValue[k] = v;
            } else {
              delete currentValue[k];
            }
          }
        }
      }
      return reviver.call(walkHolder, key, currentValue);
    })(holder, '');
  }

  return parse;
};
