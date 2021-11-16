/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum AnnoTypes {
  error = 'error',
  warning = 'warning',
}

export type Parser = ReturnType<typeof createParser>;

export interface Annotation {
  name?: string;
  type: AnnoTypes;
  text: string;
  at: number;
}

export interface ParseResult {
  annotations: Annotation[];
}

/* eslint-disable */

export const createParser = () => {
  'use strict';
  let at: any,
    annos: any[], // annotations
    ch: any,
    text: any,
    value: any,
    escapee: any = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '	',
    },
    error = function (m: string) {
      throw {
        at: at,
        text: m,
        message: m,
      };
    },
    warning = function (m: string, idx: number) {
      annos.push({
        type: AnnoTypes.warning,
        at: idx,
        text: m,
      });
    },
    next = function (c?: string) {
      return (
        c && c !== ch && error("Expected '" + c + "' instead of '" + ch + "'"),
        (ch = text.charAt(at)),
        (at += 1),
        ch
      );
    },
    peek = function (c: string) {
      return text.substr(at, c.length) === c; // nocommit - double check
    },
    number = function () {
      var number,
        string = '';
      for ('-' === ch && ((string = '-'), next('-')); ch >= '0' && '9' >= ch; )
        (string += ch), next();
      if ('.' === ch) for (string += '.'; next() && ch >= '0' && '9' >= ch; ) string += ch;
      if ('e' === ch || 'E' === ch)
        for (
          string += ch, next(), ('-' === ch || '+' === ch) && ((string += ch), next());
          ch >= '0' && '9' >= ch;

        )
          (string += ch), next();
      return (number = +string), isNaN(number) ? (error('Bad number'), void 0) : number;
    },
    stringLiteral = function () {
      let quotes = '"""';
      let end = text.indexOf('\\"' + quotes, at + quotes.length);

      if (end >= 0) {
        quotes = '\\"' + quotes;
      } else {
        end = text.indexOf(quotes, at + quotes.length);
      }

      if (end >= 0) {
        for (let l = end - at + quotes.length; l > 0; l--) {
          next();
        }
      }

      return next();
    },
    string = function () {
      let hex: any,
        i: any,
        uffff: any,
        string = '';

      if ('"' === ch) {
        for (; next(); ) {
          if ('"' === ch) return next(), string;
          if ('\\' === ch)
            if ((next(), 'u' === ch)) {
              for (
                uffff = 0, i = 0;
                4 > i && ((hex = parseInt(next(), 16)), isFinite(hex));
                i += 1
              )
                uffff = 16 * uffff + hex;
              string += String.fromCharCode(uffff);
            } else {
              if ('string' != typeof escapee[ch]) break;
              string += escapee[ch];
            }
          else string += ch;
        }
      }

      error('Bad string');
    },
    white = function () {
      for (; ch && ' ' >= ch; ) next();
    },
    word = function () {
      switch (ch) {
        case 't':
          return next('t'), next('r'), next('u'), next('e'), !0;
        case 'f':
          return next('f'), next('a'), next('l'), next('s'), next('e'), !1;
        case 'n':
          return next('n'), next('u'), next('l'), next('l'), null;
      }
      error("Unexpected '" + ch + "'");
    },
    array = function () {
      var array: any[] = [];
      if ('[' === ch) {
        if ((next('['), white(), ']' === ch)) return next(']'), array;
        for (; ch; ) {
          if ((array.push(value()), white(), ']' === ch)) return next(']'), array;
          next(','), white();
        }
      }
      error('Bad array');
    },
    object = function () {
      var key,
        object: any = {};
      if ('{' === ch) {
        if ((next('{'), white(), '}' === ch)) return next('}'), object;
        for (; ch; ) {
          let latchKeyStart = at;
          if (
            ((key = string()),
            white(),
            next(':'),
            Object.hasOwnProperty.call(object, key!) &&
              warning('Duplicate key "' + key + '"', latchKeyStart),
            (object[key!] = value()),
            white(),
            '}' === ch)
          )
            return next('}'), object;
          next(','), white();
        }
      }
      error('Bad object');
    };
  return (
    (value = function () {
      if (peek('"""')) {
        return stringLiteral();
      }
      switch ((white(), ch)) {
        case '{':
          return object();
        case '[':
          return array();
        case '"':
          return string();
        case '-':
          return number();
        default:
          return ch >= '0' && '9' >= ch ? number() : word();
      }
    }),
    function (source: string) {
      annos = [];
      let errored = false;
      text = source;
      at = 0;
      ch = ' ';
      white();

      try {
        value();
        white();
      } catch (e) {
        errored = true;
        annos.push({ type: AnnoTypes.error, at: e.at - 1, text: e.message });
      }
      if (!errored && ch) {
        annos.push({ type: AnnoTypes.error, at: at, text: 'Syntax Error' });
      }
      return { annotations: annos };
    }
  );
};
