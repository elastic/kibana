/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Matches every single [A-Za-z] character, `<tag attr="any > text">`, `](markdown-link-address)` and `@I18N@valid_variable_name@I18N@`
 */
const CHARS_FOR_PSEUDO_LOCALIZATION_REGEX =
  /[A-Za-z]|(\]\([\s\S]*?\))|(<([^"<>]|("[^"]*?"))*?>)|(@I18N@\w*?@I18N@)/g;
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
