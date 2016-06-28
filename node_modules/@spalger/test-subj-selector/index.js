function seletorToTerms(selector) {
  return selector
  .replace(/\s*&\s*/g, '&') // remove all whitespace around joins
  .split(/\s+/)
}

function termToCssSelector(term) {
  return term ? '[data-test-subj~="' + term + '"]' : '';
}

module.exports = function testSubjSelector(selector) {
  var cssSelectors = [];
  var terms = seletorToTerms(selector);

  while (terms.length) {
    var term = terms.shift();
    // split each term by joins/& and map to css selectors
    cssSelectors.push(term.split('&').map(termToCssSelector).join(''));
  }

  return cssSelectors.join(' ');
};
