/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable prettier/prettier,prefer-const,no-throw-literal,camelcase,@typescript-eslint/no-shadow,one-var,object-shorthand,eqeqeq */

export const createParser = () => {

  let at, // The index of the current character
    ch, // The current character
    annos, // annotations
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
    annotate = function (type, text) {
      annos.push({ type: type, text: text, at: at });
    },
    requestEvents,
    getLastRequest = function() {
      return requestEvents.length > 0 ? requestEvents.pop() : {};
    },
    addRequestStart = function() {
      requestEvents.push({startOffset: at});
    },
    addRequestEnd = function() {
      const lastRequest = getLastRequest();
      lastRequest.endOffset = at;
      requestEvents.push(lastRequest);
    },
    addRequestMethod = function(method) {
      const lastRequest = getLastRequest();
      lastRequest.method = method;
      requestEvents.push(lastRequest);
    },
    addRequestUrl = function(url) {
      const lastRequest = getLastRequest();
      lastRequest.url = url;
      requestEvents.push(lastRequest);
    },
    addRequestData = function(data) {
      const lastRequest = getLastRequest();
      const dataArray = lastRequest.data || [];
      dataArray.push(data);
      lastRequest.data = dataArray;
      requestEvents.push(lastRequest);
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
    // parses and returns the method
    method = function () {
      switch (ch) {
        case 'g':
          next('g');
          next('e');
          next('t');
          return 'get';
        case 'G':
          next('G');
          next('E');
          next('T');
          return 'GET';
        case 'h':
          next('h');
          next('e');
          next('a');
          next('d');
          return 'head';
        case 'H':
          next('H');
          next('E');
          next('A');
          next('D');
          return 'HEAD';
        case 'd':
          next('d');
          next('e');
          next('l');
          next('e');
          next('t');
          next('e');
          return 'delete';
        case 'D':
          next('D');
          next('E');
          next('L');
          next('E');
          next('T');
          next('E');
          return 'DELETE';
        case 'p':
          next('p');
          switch (ch) {
            case 'a':
              next('a');
              next('t');
              next('c');
              next('h');
              return 'patch';
            case 'u':
              next('u');
              next('t');
              return 'put';
            case 'o':
              next('o');
              next('s');
              next('t');
              return 'post';
            default:
              error('Unexpected \'' + ch + '\'');
          }
          break;
        case 'P':
          next('P');
          switch (ch) {
            case 'A':
              next('A');
              next('T');
              next('C');
              next('H');
              return 'PATCH';
            case 'U':
              next('U');
              next('T');
              return 'PUT';
            case 'O':
              next('O');
              next('S');
              next('T');
              return 'POST';
            default:
              error('Unexpected \'' + ch + '\'');
          }
          break;
        default:
          error('Expected one of GET/POST/PUT/DELETE/HEAD/PATCH');
      }
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

  let url = function () {
      let url = '';
      while (ch && ch != '\n') {
        url += ch;
        next();
      }
      if (url == '') {
        error('Missing url');
      }
      return url;
    },
    request = function () {
      white();
      addRequestStart();
      const parsedMethod = method();
      addRequestMethod(parsedMethod);
      strictWhite();
      const parsedUrl = url();
      addRequestUrl(parsedUrl );
      strictWhite(); // advance to one new line
      newLine();
      strictWhite();
      if (ch == '{') {
        const parsedObject = object();
        addRequestData(parsedObject);
      }
      // multi doc request
      strictWhite(); // advance to one new line
      newLine();
      strictWhite();
      while (ch == '{') {
        // another object
        const parsedObject = object();
        addRequestData(parsedObject);
        strictWhite();
        newLine();
        strictWhite();
      }
      addRequestEnd();
    },
    comment = function () {
      while (ch == '#') {
        while (ch && ch !== '\n') {
          next();
        }
        white();
      }
    },
    multi_request = function () {
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
          request();
          white();
        } catch (e) {
          annotate('error', e.message);
          // snap
          const substring = text.substr(at);
          const nextMatch = substring.search(/^POST|HEAD|GET|PUT|DELETE|PATCH/m);
          if (nextMatch < 1) return;
          reset(at + nextMatch);
        }
      }
    };

  return function (source, reviver) {
    let result;

    text = source;
    at = 0;
    annos = [];
    requestEvents = [];
    next();
    multi_request();
    white();
    if (ch) {
      annotate('error', 'Syntax error');
    }

    result = { errors: annos, requests: requestEvents };

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
