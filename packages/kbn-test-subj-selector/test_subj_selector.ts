/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function selectorToTerms(selector: string) {
  return selector
    .replace(/\s*~\s*/g, '~') // css locator with '~' operator cannot contain spaces
    .replace(/\s*>\s*/g, '>') // remove all whitespace around joins >
    .replace(/\s*&\s*/g, '&') // remove all whitespace around joins &
    .split(/>+/);
}

function termToCssSelector(term: string) {
  if (term) {
    return term.startsWith('~')
      ? '[data-test-subj~="' + term.substring(1).replace(/\s/g, '') + '"]'
      : '[data-test-subj="' + term + '"]';
  } else {
    return '';
  }
}

/**
 * Converts a testSubject selector into a CSS selector.
 *
 * testSubject selector syntax rules:
 *
 *   - `data-test-subj` values can include spaces
 *
 *   - prefixing a value with `~` will allow matching a single word in a `data-test-subj` that uses several space delimited list words
 *     - example: `~foo`
 *     - css equivalent: `[data-test-subj~="foo"]`
 *
 *   - the `>` character is used between two values to indicate that the value on the right must match an element inside an element matched by the value on the left
 *     - example: `foo > bar`
 *     - css equivalent: `[data-test-subj=foo] [data-test-subj=bar]`
 *
 *   - the `&` character is used between two values to indicate that the value on both sides must both match the element
 *     - example: `foo & bar`
 *     - css equivalent: `[data-test-subj=foo][data-test-subj=bar]`
 */
export function subj(selector: string) {
  return selectorToTerms(selector)
    .map((term) =>
      // split each term by joins/& and map to css selectors
      term.split('&').map(termToCssSelector).join('')
    )
    .join(' ');
}
