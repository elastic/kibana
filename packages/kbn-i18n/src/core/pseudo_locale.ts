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

/**
 * Matches every single [A-Za-z] character, `<tag attr="any > text">`, `](markdown-link-address)` and `@I18N@valid_variable_name@I18N@`
 */
const CHARS_FOR_PSEUDO_LOCALIZATION_REGEX = /[A-Za-z]|(\]\([\s\S]*?\))|(<([^"<>]|("[^"]*?"))*?>)|(@I18N@\w*?@I18N@)/g;
const PSEUDO_ACCENTS_LOCALE = 'en-xa';

export function isPseudoLocale(locale: string) {
  return locale.toLowerCase() === PSEUDO_ACCENTS_LOCALE;
}

/**
 * Replaces every latin char by pseudo char and repeats every third char twice.
 */
function replacer() {
  let count = 0;

  return (match: string) => {
    // if `match.length !== 1`, then `match` is html tag or markdown link address, so it should be ignored
    if (match.length !== 1) {
      return match;
    }

    const pseudoChar = pseudoAccentCharMap[match] || match;
    return ++count % 3 === 0 ? pseudoChar.repeat(2) : pseudoChar;
  };
}

export function translateUsingPseudoLocale(message: string) {
  return message.replace(CHARS_FOR_PSEUDO_LOCALIZATION_REGEX, replacer());
}

const pseudoAccentCharMap: Record<string, string> = {
  a: 'à',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'î',
  l: 'ļ',
  k: 'ķ',
  j: 'ĵ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ô',
  p: 'þ',
  q: 'ǫ',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'û',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'À',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Î',
  L: 'Ļ',
  K: 'Ķ',
  J: 'Ĵ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ô',
  P: 'Þ',
  Q: 'Ǫ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ţ',
  U: 'Û',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};
