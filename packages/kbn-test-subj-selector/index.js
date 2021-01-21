/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

function selectorToTerms(selector) {
  return selector
    .replace(/\s*~\s*/g, '~') // css locator with '~' operator cannot contain spaces
    .replace(/\s*>\s*/g, '>') // remove all whitespace around joins >
    .replace(/\s*&\s*/g, '&') // remove all whitespace around joins &
    .split(/>+/);
}

function termToCssSelector(term) {
  if (term) {
    return term.startsWith('~')
      ? '[data-test-subj~="' + term.substring(1).replace(/\s/g, '') + '"]'
      : '[data-test-subj="' + term + '"]';
  } else {
    return '';
  }
}

module.exports = function testSubjSelector(selector) {
  const cssSelectors = [];
  const terms = selectorToTerms(selector);

  while (terms.length) {
    const term = terms.shift();
    // split each term by joins/& and map to css selectors
    cssSelectors.push(term.split('&').map(termToCssSelector).join(''));
  }

  return cssSelectors.join(' ');
};
