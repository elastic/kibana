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
    cssSelectors.push(
      term
        .split('&')
        .map(termToCssSelector)
        .join('')
    );
  }

  return cssSelectors.join(' ');
};
