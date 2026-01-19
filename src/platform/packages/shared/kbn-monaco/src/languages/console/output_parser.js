/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable prettier/prettier,prefer-const,no-throw-literal,camelcase,@typescript-eslint/no-shadow,one-var,object-shorthand,eqeqeq */

export const createOutputParser = () => {
  let at, // The index of the current character
    ch, // The current character
    escapee = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    },
    text,
    errors,
    addError = function (text) {
      errors.push({ text: text, offset: at });
    },
    responses,
    responseStartOffset,
    responseEndOffset,
    getLastResponse = function() {
      return responses.length > 0 ? responses.pop() : {};
    },
    addResponseStart = function() {
      responseStartOffset = at - 1;
      responses.push({ startOffset: responseStartOffset });
    },
    addResponseData = function(data) {
      const lastResponse = getLastResponse();
      const dataArray = lastResponse.data || [];
      dataArray.push(data);
      lastResponse.data = dataArray;
      responses.push(lastResponse);
      responseEndOffset = at - 1;
    },
    addResponseEnd = function() {
      const lastResponse = getLastResponse();
      lastResponse.endOffset = responseEndOffset;
      responses.push(lastResponse);
    },
    error = function (m) {
      throw {
        name: 'SyntaxError',
        message: m,
        at: at,
        text: text,
      };
    },
    reset = function (newAt) {
      ch = text.charAt(newAt);
      at = newAt + 1;
    },
    next = function (c) {
      if (c && c !== ch) {
        error('Expected \'' + c + '\' instead of \'' + ch + '\'');
      }

      ch = text.charAt(at);
      at += 1;
      return ch;
    },
    nextUpTo = function (upTo, errorMessage) {
      let currentAt = at,
        i = text.indexOf(upTo, currentAt);
      if (i < 0) {
        error(errorMessage || 'Expected \'' + upTo + '\'');
      }
      reset(i + upTo.length);
      return text.substring(currentAt, i);
    },
    peek = function (offset) {
      return text.charAt(at + offset);
    },
    number = function () {
      let number,
        string = '';

      if (ch === '-') {
        string = '-';
        next('-');
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        next();
      }
      if (ch === '.') {
        string += '.';
        while (next() && ch >= '0' && ch <= '9') {
          string += ch;
        }
      }
      if (ch === 'e' || ch === 'E') {
        string += ch;
        next();
        if (ch === '-' || ch === '+') {
          string += ch;
          next();
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      number = +string;
      if (isNaN(number)) {
        error('Bad number');
      } else {
        return number;
      }
    },
    string = function () {
      let hex,
        i,
        string = '',
        uffff;

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
              return string;
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
                string += String.fromCharCode(uffff);
              } else if (typeof escapee[ch] === 'string') {
                string += escapee[ch];
              } else {
                break;
              }
            } else {
              string += ch;
            }
          }
        }
      }
      error('Bad string');
    },
    white = function () {
      while (ch) {
        // Skip whitespace.
        while (ch && ch <= ' ') {
          next();
        }
        // if the current char in iteration is '#' or the char and the next char is equal to '//'
        // we are on the single line comment
        if (ch === '#' || ch === '/' && peek(0) === '/') {
          // Until we are on the new line, skip to the next char
          while (ch && ch !== '\n') {
            next();
          }
        } else if (ch === '/' && peek(0) === '*') {
          // If the chars starts with '/*', we are on the multiline comment
          next();
          next();
          while (ch && !(ch === '*' && peek(0) === '/')) {
            // Until we have closing tags '*/', skip to the next char
            next();
          }
          if (ch) {
            next();
            next();
          }
        } else break;
      }
    },
    strictWhite = function () {
      while (ch && (ch == ' ' || ch == '\t')) {
        next();
      }
    },
    newLine = function () {
      if (ch == '\n') next();
    },
    word = function () {
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
      error('Unexpected \'' + ch + '\'');
    },
    value, // Place holder for the value function.
    array = function () {
      const array = [];

      if (ch === '[') {
        next('[');
        white();
        if (ch === ']') {
          next(']');
          return array; // empty array
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === ']') {
            next(']');
            return array;
          }
          next(',');
          white();
        }
      }
      error('Bad array');
    },
    object = function () {
      let key,
        object = {};

      if (ch === '{') {
        next('{');
        white();
        if (ch === '}') {
          next('}');
          return object; // empty object
        }
        while (ch) {
          key = string();
          white();
          next(':');
          if (Object.hasOwnProperty.call(object, key)) {
            error('Duplicate key "' + key + '"');
          }
          object[key] = value();
          white();
          if (ch === '}') {
            next('}');
            return object;
          }
          next(',');
          white();
        }
      }
      error('Bad object');
    };

  value = function () {
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
  };

  let response = function () {
      white();
      addResponseStart();
      // it can be an object
      if (ch == '{') {
        const parsedObject = object();
        addResponseData(parsedObject);
      // but it could also be an array of objects
      } else if (ch == '[') {
        const parsedArray = array();
        parsedArray.forEach(item => {
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
      while (ch == '{') {
        // another object
        const parsedObject = object();
        addResponseData(parsedObject);
        strictWhite();
        newLine();
        strictWhite();
      }
      addResponseEnd();
    },
    comment = function () {
      while (ch == '#') {
        while (ch && ch !== '\n') {
          next();
        }
        white();
      }
    },
    multi_response = function () {
      while (ch && ch != '') {
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
        } catch (e) {
          addError(e.message);
          // snap
          const substring = text.substr(at);
          const nextMatch = substring.search(/[#{]/);
          if (nextMatch < 1) return;
          reset(at + nextMatch);
        }
      }
    };

  return function (source, reviver) {
    let result;

    text = source;
    at = 0;
    errors = [];
    responses = [];
    next();
    multi_response();
    white();
    if (ch) {
      addError('Syntax error');
    }

    result = { errors, responses };

    return typeof reviver === 'function'
      ? (function walk(holder, key) {
        let k,
          v,
          value = holder[key];
        if (value && typeof value === 'object') {
          for (k in value) {
            if (Object.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            }
          }
        }
        return reviver.call(holder, key, value);
      }({ '': result }, ''))
      : result;
  };
}
