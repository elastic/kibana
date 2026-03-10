/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConsoleOutputParser,
  ConsoleOutputParsedResponse,
  ConsoleOutputParserResult,
  ConsoleParserReviver,
  ErrorAnnotation,
} from './types';
import { isRecordLike } from './utils/record_utils';
import { getErrorMessage } from './utils/error_utils';

export const createOutputParser = (): ConsoleOutputParser => {
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
  let responses: ConsoleOutputParsedResponse[] = [];
  let responseStartOffset: number | undefined;
  let responseEndOffset: number | undefined;
  const getLastResponse = function () {
    const last = responses.length > 0 ? responses.pop() : undefined;
    if (last) {
      return last;
    }
    return { startOffset: responseStartOffset ?? 0 };
  };
  const addResponseStart = function () {
    responseStartOffset = at - 1;
    responses.push({ startOffset: responseStartOffset });
  };
  const addResponseData = function (data: unknown) {
    const lastResponse = getLastResponse();
    const dataArray = lastResponse.data || [];
    dataArray.push(data);
    lastResponse.data = dataArray;
    responses.push(lastResponse);
    responseEndOffset = at - 1;
  };
  const addResponseEnd = function () {
    const lastResponse = getLastResponse();
    lastResponse.endOffset = responseEndOffset;
    responses.push(lastResponse);
  };
  const error = function (m: string): never {
    throw Object.assign(new SyntaxError(m), { at, text });
  };
  const reset = function (newAt: number) {
    ch = text.charAt(newAt);
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

  const response = function () {
    white();
    addResponseStart();
    // it can be an object
    if (ch === '{') {
      const parsedObject = object();
      addResponseData(parsedObject);
      // but it could also be an array of objects
    } else if (ch === '[') {
      const parsedArray = array();
      parsedArray.forEach((item) => {
        if (typeof item === 'object') {
          addResponseData(item);
        } else {
          error('Array elements must be objects');
        }
      });
    } else {
      error('Invalid input');
    }
    // multi doc response
    strictWhite(); // advance to one new line
    newLine();
    strictWhite();
    while (ch === '{') {
      // another object
      const parsedObject = object();
      addResponseData(parsedObject);
      strictWhite();
      newLine();
      strictWhite();
    }
    addResponseEnd();
  };
  const comment = function () {
    while (ch === '#') {
      while (ch && ch !== '\n') {
        ch = next();
      }
      white();
    }
  };
  const multiResponse = function () {
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
        response();
        white();
      } catch (e: unknown) {
        addError(getErrorMessage(e));
        // snap
        const substring = text.substr(at);
        const nextMatch = substring.search(/[#{]/);
        if (nextMatch < 1) return;
        reset(at + nextMatch);
      }
    }
  };

  function parse(source: string): ConsoleOutputParserResult;
  function parse(source: string, reviver: ConsoleParserReviver): unknown;
  function parse(source: string, reviver?: ConsoleParserReviver): unknown {
    text = source;
    at = 0;
    errors = [];
    responses = [];
    next();
    multiResponse();
    white();
    if (ch) {
      addError('Syntax error');
    }

    const result = { errors, responses };

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
