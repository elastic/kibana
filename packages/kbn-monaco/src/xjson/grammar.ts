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
    reset = function (newAt: number) {
      ch = text.charAt(newAt);
      at = newAt + 1;
    },
    next = function (c?: string) {
      return (
        c && c !== ch && error("Expected '" + c + "' instead of '" + ch + "'"),
        (ch = text.charAt(at)),
        (at += 1),
        ch
      );
    },
    nextUpTo = function (upTo: any, errorMessage: string) {
      let currentAt = at,
        i = text.indexOf(upTo, currentAt);
      if (i < 0) {
        error(errorMessage || "Expected '" + upTo + "'");
      }
      reset(i + upTo.length);
      return text.substring(currentAt, i);
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
    string = function () {
      let hex: any,
        i: any,
        uffff: any,
        string = '';
      if ('"' === ch) {
        if (peek('""')) {
          // literal
          next('"');
          next('"');
          return nextUpTo('"""', 'failed to find closing \'"""\'');
        } else {
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
            Object.hasOwnProperty.call(object, key) &&
              warning('Duplicate key "' + key + '"', latchKeyStart),
            (object[key] = value()),
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
